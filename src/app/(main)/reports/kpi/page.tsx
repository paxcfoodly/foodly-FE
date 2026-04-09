'use client';

import React, { useState, useCallback, useEffect } from 'react';
import {
  Card,
  DatePicker,
  Button,
  Space,
  Typography,
  Row,
  Col,
  Statistic,
  Spin,
} from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import dayjs, { type Dayjs } from 'dayjs';
import OeeGaugeChart from '@/components/equipment/OeeGaugeChart';
import ProdDailyBarChart from '@/components/reports/ProdDailyBarChart';
import DefectRateTrendChart from '@/components/reports/DefectRateTrendChart';
import OeeTrendChart from '@/components/equipment/OeeTrendChart';
import InventoryBarChart from '@/components/reports/InventoryBarChart';
import apiClient from '@/lib/apiClient';

const { RangePicker } = DatePicker;

// ─── Types ───

interface KpiData {
  prodAchieveRate: number;
  defectRate: number;
  avgOee: number;
  avgTurnover: number;
}

interface ProdSummaryRow {
  good_qty: number;
  order_qty: number;
}

interface ParetoRow {
  total_qty: number;
}

interface OeeSummaryRow {
  oee: number;
}

interface OeeTrendPoint {
  date: string;
  availability: number;
  oee: number;
}

interface InventoryRow {
  item_nm: string;
  qty: number;
  turnover_rate: number;
}

interface ProdDailyRow {
  date: string;
  good_qty: number;
  achieve_rate: number;
}

interface DefectTrendRow {
  date: string;
  defect_rate: number;
}

// ─── Page ───

export default function KpiDashboardPage() {
  const now = dayjs();
  const defaultStart = now.startOf('month');
  const defaultEnd = now;

  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs]>([defaultStart, defaultEnd]);
  const [kpiData, setKpiData] = useState<KpiData>({
    prodAchieveRate: 0,
    defectRate: 0,
    avgOee: 0,
    avgTurnover: 0,
  });
  const [prodDailyData, setProdDailyData] = useState<ProdDailyRow[]>([]);
  const [defectTrendData, setDefectTrendData] = useState<DefectTrendRow[]>([]);
  const [oeeTrendData, setOeeTrendData] = useState<OeeTrendPoint[]>([]);
  const [inventoryData, setInventoryData] = useState<InventoryRow[]>([]);
  const [loading, setLoading] = useState(false);

  const startDate = dateRange[0].format('YYYY-MM-DD');
  const endDate = dateRange[1].format('YYYY-MM-DD');

  const fetchAll = useCallback(async (start: string, end: string) => {
    setLoading(true);
    try {
      const [prodSummaryRes, qualityParetoRes, oeeSummaryRes, inventoryRes, prodDailyRes, qualityTrendRes, oeeTrendRes] =
        await Promise.all([
          apiClient.get('/v1/reports/production/summary', { params: { start, end, group_by: 'item' } }),
          apiClient.get('/v1/reports/quality/pareto', { params: { start, end } }),
          apiClient.get('/v1/oee/summary', { params: { start, end } }),
          apiClient.get('/v1/reports/inventory/summary'),
          apiClient.get('/v1/reports/production/daily', { params: { start, end } }),
          apiClient.get('/v1/reports/quality/trend', { params: { start, end } }),
          apiClient.get('/v1/oee/trend', { params: { start, end } }),
        ]);

      const prodSummary: ProdSummaryRow[] = prodSummaryRes.data.data ?? [];
      const qualityPareto: ParetoRow[] = qualityParetoRes.data.data ?? [];
      const oeeSummary: OeeSummaryRow[] = oeeSummaryRes.data.data ?? [];
      const inventory: InventoryRow[] = inventoryRes.data.data ?? [];
      const prodDaily: ProdDailyRow[] = prodDailyRes.data.data ?? [];
      const qualityTrend: DefectTrendRow[] = qualityTrendRes.data.data ?? [];
      const oeeTrend: OeeTrendPoint[] = oeeTrendRes.data.data ?? [];

      // Calculate KPI values
      const totalGood = prodSummary.reduce((s, r) => s + (r.good_qty ?? 0), 0);
      const totalOrder = prodSummary.reduce((s, r) => s + (r.order_qty ?? 0), 0);
      const prodAchieveRate = totalOrder > 0 ? Math.round((totalGood / totalOrder) * 1000) / 10 : 0;

      const totalDefect = qualityPareto.reduce((s, r) => s + (r.total_qty ?? 0), 0);
      const defectRate = totalOrder > 0 ? Math.round((totalDefect / totalOrder) * 10000) / 100 : 0;

      const oeeValues = oeeSummary.map((r) => r.oee).filter((v) => v != null);
      const avgOee = oeeValues.length > 0
        ? Math.round((oeeValues.reduce((s, v) => s + v, 0) / oeeValues.length) * 10) / 10
        : 0;

      const turnoverValues = inventory.map((r) => r.turnover_rate).filter((v) => v != null && v > 0);
      const avgTurnover = turnoverValues.length > 0
        ? Math.round((turnoverValues.reduce((s, v) => s + v, 0) / turnoverValues.length) * 10) / 10
        : 0;

      setKpiData({ prodAchieveRate, defectRate, avgOee, avgTurnover });
      setProdDailyData(prodDaily);
      setDefectTrendData(qualityTrend);
      setOeeTrendData(oeeTrend);
      setInventoryData(
        [...inventory]
          .sort((a, b) => b.qty - a.qty)
          .slice(0, 10),
      );
    } catch {
      setKpiData({ prodAchieveRate: 0, defectRate: 0, avgOee: 0, avgTurnover: 0 });
      setProdDailyData([]);
      setDefectTrendData([]);
      setOeeTrendData([]);
      setInventoryData([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll(startDate, endDate);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSearch = () => fetchAll(startDate, endDate);

  const handleThisMonth = () => {
    const start = dayjs().startOf('month');
    const end = dayjs();
    setDateRange([start, end]);
    fetchAll(start.format('YYYY-MM-DD'), end.format('YYYY-MM-DD'));
  };

  const handleThisWeek = () => {
    const start = dayjs().startOf('week');
    const end = dayjs();
    setDateRange([start, end]);
    fetchAll(start.format('YYYY-MM-DD'), end.format('YYYY-MM-DD'));
  };

  return (
    <div style={{ padding: '0 0 24px' }}>
      <Typography.Title level={4} style={{ marginBottom: 16 }}>
        종합 KPI 대시보드
      </Typography.Title>

      {/* Period Filter (inline, no Card wrapper) */}
      <Space wrap style={{ marginBottom: 24 }}>
        <Button onClick={handleThisMonth}>이번달</Button>
        <Button onClick={handleThisWeek}>이번주</Button>
        <RangePicker
          value={dateRange}
          onChange={(vals) => {
            if (vals && vals[0] && vals[1]) {
              setDateRange([vals[0], vals[1]]);
            }
          }}
        />
        <Button type="primary" icon={<SearchOutlined />} onClick={handleSearch} loading={loading}>
          조회
        </Button>
      </Space>

      {/* KPI Cards — 4 columns */}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            {loading ? (
              <div style={{ height: 80, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Spin />
              </div>
            ) : (
              <Statistic
                title="생산 달성률"
                value={kpiData.prodAchieveRate}
                suffix="%"
                precision={1}
                valueStyle={{ fontSize: 28, fontWeight: 600 }}
              />
            )}
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            {loading ? (
              <div style={{ height: 80, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Spin />
              </div>
            ) : (
              <Statistic
                title="불량률"
                value={kpiData.defectRate}
                suffix="%"
                precision={2}
                valueStyle={{ fontSize: 28, fontWeight: 600 }}
              />
            )}
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            {loading ? (
              <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Spin />
              </div>
            ) : (
              <OeeGaugeChart title="종합 OEE" value={kpiData.avgOee} hasData={true} />
            )}
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            {loading ? (
              <div style={{ height: 80, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Spin />
              </div>
            ) : (
              <Statistic
                title="재고 회전율"
                value={kpiData.avgTurnover}
                suffix="회"
                precision={1}
                valueStyle={{ fontSize: 28, fontWeight: 600 }}
              />
            )}
          </Card>
        </Col>
      </Row>

      {/* Mini Charts Row */}
      <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card size="small" title="생산추이">
            <div style={{ height: 160, overflow: 'hidden' }}>
              <ProdDailyBarChart data={prodDailyData} />
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card size="small" title="불량률 추이">
            <div style={{ height: 160, overflow: 'hidden' }}>
              <DefectRateTrendChart data={defectTrendData} />
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card size="small" title="OEE 추이">
            <div style={{ height: 160, overflow: 'hidden' }}>
              <OeeTrendChart data={oeeTrendData} />
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card size="small" title="재고현황">
            <div style={{ height: 160, overflow: 'hidden' }}>
              <InventoryBarChart data={inventoryData} />
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
