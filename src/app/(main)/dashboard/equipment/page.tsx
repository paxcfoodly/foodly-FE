'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { Card, DatePicker, Button, Space, Typography, Flex, Empty } from 'antd';
import { SearchOutlined, ReloadOutlined } from '@ant-design/icons';
import dayjs, { type Dayjs } from 'dayjs';
import OeeGaugeChart from '@/components/equipment/OeeGaugeChart';
import AvailabilityBarChart from '@/components/equipment/AvailabilityBarChart';
import DownReasonParetoChart from '@/components/equipment/DownReasonParetoChart';
import OeeTrendChart from '@/components/equipment/OeeTrendChart';
import ExcelDownloadButton from '@/components/common/ExcelDownloadButton';
import apiClient from '@/lib/apiClient';

const { RangePicker } = DatePicker;

interface OeeResult {
  equip_cd: string;
  equip_nm: string;
  availability: number;
  performance: number;
  quality: number;
  oee: number;
  total_run_min: number;
  total_down_min: number;
  good_qty: number;
  defect_qty: number;
  has_prod_data: boolean;
}

interface OeeTrendPoint {
  date: string;
  availability: number;
  oee: number;
}

interface DownReasonPoint {
  reason_cd: string;
  reason_nm: string;
  total_minutes: number;
}

function average(arr: number[]): number {
  if (!arr.length) return 0;
  return Math.round((arr.reduce((s, v) => s + v, 0) / arr.length) * 10) / 10;
}

export default function EquipmentDashboardPage() {
  const defaultEnd = dayjs();
  const defaultStart = defaultEnd.subtract(30, 'day');

  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs]>([defaultStart, defaultEnd]);
  const [summaryData, setSummaryData] = useState<OeeResult[]>([]);
  const [trendData, setTrendData] = useState<OeeTrendPoint[]>([]);
  const [downReasonData, setDownReasonData] = useState<DownReasonPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasData, setHasData] = useState(true);

  const startDate = dateRange[0].format('YYYY-MM-DD');
  const endDate = dateRange[1].format('YYYY-MM-DD');

  const fetchAll = useCallback(async (start: string, end: string) => {
    setLoading(true);
    try {
      const [summaryRes, trendRes, paretoRes] = await Promise.all([
        apiClient.get('/v1/oee/summary', { params: { start, end } }),
        apiClient.get('/v1/oee/trend', { params: { start, end } }),
        apiClient.get('/v1/oee/down-reasons', { params: { start, end } }),
      ]);

      const summary: OeeResult[] = summaryRes.data.data ?? [];
      const trend: OeeTrendPoint[] = trendRes.data.data ?? [];
      const pareto: DownReasonPoint[] = paretoRes.data.data ?? [];

      setSummaryData(summary);
      setTrendData(trend);
      setDownReasonData(pareto);
      setHasData(summary.length > 0 || trend.length > 0);
    } catch {
      setSummaryData([]);
      setTrendData([]);
      setDownReasonData([]);
      setHasData(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll(startDate, endDate);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSearch = () => {
    fetchAll(startDate, endDate);
  };

  const handleReset = () => {
    const end = dayjs();
    const start = end.subtract(30, 'day');
    setDateRange([start, end]);
    fetchAll(start.format('YYYY-MM-DD'), end.format('YYYY-MM-DD'));
  };

  // Aggregate OEE values (average across all equipment)
  const avgAvailability = average(summaryData.map((d) => d.availability));
  const avgPerformance = average(summaryData.map((d) => d.performance));
  const avgQuality = average(summaryData.map((d) => d.quality));
  const hasProdData = summaryData.some((d) => d.has_prod_data);

  const availabilityBarData = summaryData.map((d) => ({
    equip_nm: d.equip_nm,
    availability: d.availability,
  }));

  const excelData = summaryData.map((d) => ({
    equip_cd: d.equip_cd,
    equip_nm: d.equip_nm,
    availability: d.availability,
    performance: d.performance,
    quality: d.quality,
    oee: d.oee,
    total_run_min: d.total_run_min,
    total_down_min: d.total_down_min,
  }));

  const excelColumns = [
    { header: '설비코드', key: 'equip_cd', width: 15 },
    { header: '설비명', key: 'equip_nm', width: 20 },
    { header: '가동률(%)', key: 'availability', width: 12 },
    { header: '성능률(%)', key: 'performance', width: 12 },
    { header: '양품률(%)', key: 'quality', width: 12 },
    { header: 'OEE(%)', key: 'oee', width: 12 },
    { header: '가동시간(분)', key: 'total_run_min', width: 14 },
    { header: '비가동시간(분)', key: 'total_down_min', width: 16 },
  ];

  return (
    <div style={{ padding: '0 0 24px' }}>
      <Typography.Title level={4} style={{ marginBottom: 16 }}>
        설비종합 대시보드
      </Typography.Title>

      {/* Filter bar */}
      <Card size="small" style={{ marginBottom: 24 }}>
        <Space wrap>
          <span>조회 기간:</span>
          <RangePicker
            value={dateRange}
            onChange={(vals) => {
              if (vals && vals[0] && vals[1]) {
                setDateRange([vals[0], vals[1]]);
              }
            }}
          />
          <Button type="primary" icon={<SearchOutlined />} onClick={handleSearch} loading={loading}>
            검색
          </Button>
          <Button icon={<ReloadOutlined />} onClick={handleReset}>
            초기화
          </Button>
          <ExcelDownloadButton
            filename={`OEE_${startDate}_${endDate}`}
            columns={excelColumns}
            data={excelData}
            label="엑셀 다운로드"
            disabled={excelData.length === 0}
          />
        </Space>
      </Card>

      {!hasData && !loading ? (
        <Empty
          description="선택한 기간과 설비에 대한 가동 데이터가 없습니다. 기간 또는 설비를 변경해주세요."
          style={{ padding: '48px 0' }}
        />
      ) : (
        <>
          {/* Top row: 3 OEE gauge charts */}
          <Card size="small" title="OEE 현황" style={{ marginBottom: 32 }}>
            <Flex justify="space-around" align="center" wrap="wrap" gap={16}>
              <div style={{ textAlign: 'center' }}>
                <OeeGaugeChart title="가동률" value={avgAvailability} hasData={true} />
              </div>
              <div style={{ textAlign: 'center' }}>
                <OeeGaugeChart title="성능률" value={avgPerformance} hasData={hasProdData} />
              </div>
              <div style={{ textAlign: 'center' }}>
                <OeeGaugeChart title="양품률" value={avgQuality} hasData={hasProdData} />
              </div>
            </Flex>
          </Card>

          {/* Middle row: availability bar + Pareto */}
          <Flex gap={32} style={{ marginBottom: 32 }} wrap="wrap">
            <div style={{ flex: '0 0 60%', minWidth: 300 }}>
              <Card size="small" title="설비별 가동률">
                {availabilityBarData.length > 0 ? (
                  <AvailabilityBarChart data={availabilityBarData} />
                ) : (
                  <Empty description="데이터 없음" style={{ height: 280, paddingTop: 80 }} />
                )}
              </Card>
            </div>
            <div style={{ flex: '1 1 35%', minWidth: 240 }}>
              <Card size="small" title="비가동 원인 분석 (파레토)">
                {downReasonData.length > 0 ? (
                  <DownReasonParetoChart data={downReasonData} />
                ) : (
                  <Empty description="데이터 없음" style={{ height: 280, paddingTop: 80 }} />
                )}
              </Card>
            </div>
          </Flex>

          {/* Bottom row: OEE trend */}
          <Card size="small" title="OEE 추이">
            {trendData.length > 0 ? (
              <OeeTrendChart data={trendData} />
            ) : (
              <Empty description="데이터 없음" style={{ height: 240, paddingTop: 60 }} />
            )}
          </Card>
        </>
      )}
    </div>
  );
}
