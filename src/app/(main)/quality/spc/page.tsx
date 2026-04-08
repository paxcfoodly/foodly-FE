'use client';

import React, { useCallback, useState } from 'react';
import { Alert, Col, Row, Spin } from 'antd';
import apiClient from '@/lib/apiClient';
import SpcFilterForm from '@/components/quality/SpcFilterForm';
import SpcChart from '@/components/quality/SpcChart';
import HistogramChart from '@/components/quality/HistogramChart';
import CpkDisplay from '@/components/quality/CpkDisplay';

interface Subgroup {
  index: number;
  mean: number;
  range: number;
  values: number[];
}

interface SpcData {
  totalCount: number;
  subgroupSize: number;
  subgroups: Subgroup[];
  xBar: number;
  rBar: number;
  ucl_xbar: number;
  lcl_xbar: number;
  ucl_r: number;
  lcl_r: number;
  cp: number | null;
  cpk: number | null;
  histogram: Array<{ bin: string; count: number }>;
  lsl: number | null;
  usl: number | null;
}

export default function SpcPage() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<SpcData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = useCallback(
    async (params: {
      inspect_std_id: number;
      subgroup_size: number;
      start_date?: string;
      end_date?: string;
    }) => {
      setLoading(true);
      setError(null);
      try {
        const res = await apiClient.get<{ data: SpcData }>('/v1/spc/xbar-r', { params });
        setData(res.data?.data ?? null);
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : 'SPC 데이터를 불러오는 중 오류가 발생했습니다.';
        setError(message);
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const labels = data?.subgroups.map((sg) => `${sg.index}`) ?? [];

  return (
    <div style={{ padding: '0 0 24px' }}>
      <SpcFilterForm onSearch={handleSearch} loading={loading} />

      <Spin spinning={loading}>
        {error && (
          <Alert type="error" message={error} showIcon style={{ marginBottom: 16 }} />
        )}

        {data !== null && data.totalCount < 25 && (
          <Alert
            type="info"
            message="데이터가 25건 미만입니다. SPC 분석을 위해 최소 25건의 검사 데이터가 필요합니다."
            showIcon
            style={{ marginBottom: 16 }}
          />
        )}

        {data !== null && data.totalCount >= 25 && (
          <>
            {/* Row 1: X-bar chart + R chart */}
            <Row gutter={[24, 24]} style={{ marginBottom: 24 }}>
              <Col xs={24} lg={12}>
                <div
                  style={{
                    background: '#fff',
                    padding: 16,
                    borderRadius: 6,
                    border: '1px solid #f0f0f0',
                  }}
                >
                  <SpcChart
                    title="X-bar 관리도"
                    data={data.subgroups.map((sg) => sg.mean)}
                    ucl={data.ucl_xbar}
                    lcl={data.lcl_xbar}
                    centerLine={data.xBar}
                    labels={labels}
                  />
                </div>
              </Col>
              <Col xs={24} lg={12}>
                <div
                  style={{
                    background: '#fff',
                    padding: 16,
                    borderRadius: 6,
                    border: '1px solid #f0f0f0',
                  }}
                >
                  <SpcChart
                    title="R 관리도"
                    data={data.subgroups.map((sg) => sg.range)}
                    ucl={data.ucl_r}
                    lcl={data.lcl_r}
                    centerLine={data.rBar}
                    labels={labels}
                  />
                </div>
              </Col>
            </Row>

            {/* Row 2: Histogram + Cp/Cpk */}
            <Row gutter={[24, 24]}>
              <Col xs={24} lg={12}>
                <div
                  style={{
                    background: '#fff',
                    padding: 16,
                    borderRadius: 6,
                    border: '1px solid #f0f0f0',
                  }}
                >
                  <HistogramChart
                    bins={data.histogram}
                    lsl={data.lsl}
                    usl={data.usl}
                  />
                </div>
              </Col>
              <Col xs={24} lg={12}>
                <div
                  style={{
                    background: '#fff',
                    padding: 16,
                    borderRadius: 6,
                    border: '1px solid #f0f0f0',
                  }}
                >
                  <CpkDisplay
                    cp={data.cp}
                    cpk={data.cpk}
                    totalCount={data.totalCount}
                    subgroupCount={data.subgroups.length}
                  />
                </div>
              </Col>
            </Row>
          </>
        )}
      </Spin>
    </div>
  );
}
