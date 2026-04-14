'use client';

import React, { useCallback, useState } from 'react';
import { Alert, Spinner } from '@/components/ui';
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
    <div className="pb-6">
      <SpcFilterForm onSearch={handleSearch} loading={loading} />

      <Spinner spinning={loading}>
        {error && (
          <Alert type="error" message={error} showIcon className="mb-4" />
        )}

        {data !== null && data.totalCount < 25 && (
          <Alert
            type="info"
            message="데이터가 25건 미만입니다. SPC 분석을 위해 최소 25건의 검사 데이터가 필요합니다."
            showIcon
            className="mb-4"
          />
        )}

        {data !== null && data.totalCount >= 25 && (
          <>
            {/* Row 1: X-bar chart + R chart */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <div className="bg-white p-4 rounded-md border border-gray-100">
                <SpcChart
                  title="X-bar 관리도"
                  data={data.subgroups.map((sg) => sg.mean)}
                  ucl={data.ucl_xbar}
                  lcl={data.lcl_xbar}
                  centerLine={data.xBar}
                  labels={labels}
                />
              </div>
              <div className="bg-white p-4 rounded-md border border-gray-100">
                <SpcChart
                  title="R 관리도"
                  data={data.subgroups.map((sg) => sg.range)}
                  ucl={data.ucl_r}
                  lcl={data.lcl_r}
                  centerLine={data.rBar}
                  labels={labels}
                />
              </div>
            </div>

            {/* Row 2: Histogram + Cp/Cpk */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white p-4 rounded-md border border-gray-100">
                <HistogramChart
                  bins={data.histogram}
                  lsl={data.lsl}
                  usl={data.usl}
                />
              </div>
              <div className="bg-white p-4 rounded-md border border-gray-100">
                <CpkDisplay
                  cp={data.cp}
                  cpk={data.cpk}
                  totalCount={data.totalCount}
                  subgroupCount={data.subgroups.length}
                />
              </div>
            </div>
          </>
        )}
      </Spinner>
    </div>
  );
}
