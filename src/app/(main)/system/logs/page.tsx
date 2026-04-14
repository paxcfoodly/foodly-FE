'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Eye } from 'lucide-react';
import Tag from '@/components/ui/Tag';
import Modal from '@/components/ui/Modal';
import toast from '@/components/ui/toast';
import DataGrid, { type DataGridColumn } from '@/components/common/DataGrid';
import SearchForm, { type SearchFieldDef } from '@/components/common/SearchForm';
import apiClient from '@/lib/apiClient';
import type { ApiResponse, PaginatedResponse } from '@/types';

/* ── Types ─────────────────────────────────────────── */

interface AuditLogRow {
  log_id: number;
  user_id: number | null;
  action: string;
  target_table: string | null;
  target_id: string | null;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  ip_address: string | null;
  create_dt: string;
  user?: { user_nm: string; login_id: string } | null;
  [key: string]: unknown;
}

const ACTION_COLORS: Record<string, string> = {
  CREATE: 'green',
  UPDATE: 'blue',
  DELETE: 'red',
  LOGIN: 'purple',
  LOGOUT: 'gray',
};

/* ── Component ─────────────────────────────────────── */

export default function AuditLogsPage() {
  /* ── State ─── */
  const [dataSource, setDataSource] = useState<AuditLogRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [total, setTotal] = useState(0);
  const [sortBy, setSortBy] = useState('log_id');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [searchParams, setSearchParams] = useState<Record<string, unknown>>({});

  // Detail modal
  const [detailRecord, setDetailRecord] = useState<AuditLogRow | null>(null);

  /* ── Fetch logs ─── */
  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, unknown> = {
        page,
        limit: pageSize,
      };
      if (sortBy) params.sort = `${sortBy}:${sortOrder}`;

      // Search filters
      if (searchParams.action) params.action = searchParams.action;
      if (searchParams.target_table) params.target_table = searchParams.target_table;
      if (searchParams.user_id) params.user_id = searchParams.user_id;
      if (searchParams.start_dt) {
        const dates = searchParams.start_dt as [string, string] | string;
        if (Array.isArray(dates) && dates.length === 2) {
          params.start_dt = dates[0];
          params.end_dt = dates[1];
        }
      }

      const res = await apiClient.get<ApiResponse<PaginatedResponse<AuditLogRow>>>('/v1/audit-logs', {
        params,
      });
      const responseData = res.data;
      const logs = responseData.data as unknown;

      if (Array.isArray(logs)) {
        setDataSource(logs as AuditLogRow[]);
        const pag = (responseData as any).pagination;
        setTotal(pag?.total ?? (logs as AuditLogRow[]).length);
      } else {
        setDataSource([]);
        setTotal(0);
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? '감사로그 조회에 실패했습니다.');
      setDataSource([]);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, sortBy, sortOrder, searchParams]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  /* ── Search fields ─── */
  const searchFields: SearchFieldDef[] = useMemo(
    () => [
      {
        name: 'start_dt',
        label: '기간',
        type: 'dateRange' as const,
        placeholder: '시작일 ~ 종료일',
      },
      {
        name: 'action',
        label: '액션',
        type: 'select' as const,
        placeholder: '전체',
        options: [
          { label: 'CREATE', value: 'CREATE' },
          { label: 'UPDATE', value: 'UPDATE' },
          { label: 'DELETE', value: 'DELETE' },
          { label: 'LOGIN', value: 'LOGIN' },
          { label: 'LOGOUT', value: 'LOGOUT' },
        ],
      },
      {
        name: 'target_table',
        label: '테이블',
        type: 'text' as const,
        placeholder: '테이블명',
      },
    ],
    [],
  );

  /* ── Columns ─── */
  const columns: DataGridColumn<AuditLogRow>[] = useMemo(
    () => [
      {
        title: 'ID',
        dataIndex: 'log_id',
        width: 80,
        sorter: true,
        align: 'center' as const,
      },
      {
        title: '일시',
        dataIndex: 'create_dt',
        width: 170,
        sorter: true,
        render: (val: unknown) => {
          if (!val) return '-';
          return new Date(val as string).toLocaleString('ko-KR');
        },
      },
      {
        title: '사용자',
        dataIndex: 'user_id',
        width: 120,
        render: (_: unknown, record: AuditLogRow) =>
          record.user ? `${record.user.user_nm} (${record.user.login_id})` : String(record.user_id ?? '-'),
      },
      {
        title: '액션',
        dataIndex: 'action',
        width: 100,
        sorter: true,
        align: 'center' as const,
        render: (val: unknown) => {
          const action = val as string;
          return <Tag color={ACTION_COLORS[action] ?? 'gray'}>{action}</Tag>;
        },
      },
      {
        title: '테이블',
        dataIndex: 'target_table',
        width: 150,
        sorter: true,
      },
      {
        title: '대상ID',
        dataIndex: 'target_id',
        width: 100,
        render: (val: unknown) => (val as string) ?? '-',
      },
      {
        title: 'IP',
        dataIndex: 'ip_address',
        width: 130,
        render: (val: unknown) => (val as string) ?? '-',
      },
      {
        title: '상세',
        dataIndex: '_action',
        width: 70,
        align: 'center' as const,
        fixed: 'right' as const,
        render: (_: unknown, record: AuditLogRow) => (
          <button
            onClick={() => setDetailRecord(record)}
            className="text-cyan-accent hover:underline text-sm inline-flex items-center gap-1"
          >
            <Eye className="w-4 h-4" /> 보기
          </button>
        ),
      },
    ],
    [],
  );

  /* ── Handlers ─── */
  const handleSearch = useCallback((values: Record<string, unknown>) => {
    setPage(1);
    setSearchParams(values);
  }, []);

  const handleReset = useCallback(() => {
    setPage(1);
    setSearchParams({});
  }, []);

  const handlePageChange = useCallback((p: number, ps: number) => {
    setPage(p);
    setPageSize(ps);
  }, []);

  const handleSortChange = useCallback((field: string, order: 'asc' | 'desc') => {
    setSortBy(field);
    setSortOrder(order);
  }, []);

  /* ── JSON diff renderer ─── */
  const renderJsonDiff = useCallback(
    (oldVals: Record<string, unknown> | null, newVals: Record<string, unknown> | null) => {
      if (!oldVals && !newVals) return <span className="text-gray-400">변경 데이터 없음</span>;

      const allKeys = new Set([
        ...Object.keys(oldVals ?? {}),
        ...Object.keys(newVals ?? {}),
      ]);

      return (
        <table className="w-full border-collapse text-[13px]">
          <thead>
            <tr className="border-b-2 border-gray-100">
              <th className="px-2 py-1.5 text-left">필드</th>
              <th className="px-2 py-1.5 text-left">변경 전</th>
              <th className="px-2 py-1.5 text-left">변경 후</th>
            </tr>
          </thead>
          <tbody>
            {Array.from(allKeys).map((key) => {
              const oldVal = oldVals?.[key];
              const newVal = newVals?.[key];
              const changed = JSON.stringify(oldVal) !== JSON.stringify(newVal);
              return (
                <tr
                  key={key}
                  className={`border-b border-gray-100 ${changed ? 'bg-yellow-50' : ''}`}
                >
                  <td className="px-2 py-1 font-medium">{key}</td>
                  <td className={`px-2 py-1 break-all ${changed ? 'text-red-500' : 'text-gray-500'}`}>
                    {oldVal !== undefined ? JSON.stringify(oldVal) : '-'}
                  </td>
                  <td className={`px-2 py-1 break-all ${changed ? 'text-green-600' : 'text-gray-500'}`}>
                    {newVal !== undefined ? JSON.stringify(newVal) : '-'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      );
    },
    [],
  );

  /* ── Render ─── */
  return (
    <div>
      {/* 검색 영역 */}
      <SearchForm
        fields={searchFields}
        onSearch={handleSearch}
        onReset={handleReset}
        loading={loading}
      />

      {/* 데이터 그리드 */}
      <DataGrid<AuditLogRow>
        columns={columns}
        dataSource={dataSource}
        rowKey="log_id"
        loading={loading}
        page={page}
        pageSize={pageSize}
        total={total}
        onPageChange={handlePageChange}
        sortBy={sortBy}
        sortOrder={sortOrder}
        onSortChange={handleSortChange}
        scrollX={1100}
      />

      {/* 상세 보기 모달 */}
      <Modal
        open={!!detailRecord}
        title={`감사로그 상세 (#${detailRecord?.log_id ?? ''})`}
        width={800}
        onClose={() => setDetailRecord(null)}
      >
        {detailRecord && (
          <>
            <div className="grid grid-cols-2 gap-x-6 gap-y-2 mb-4 text-sm border border-gray-100 rounded-lg p-4">
              <div><span className="text-gray-400 font-medium">로그ID:</span> {detailRecord.log_id}</div>
              <div><span className="text-gray-400 font-medium">일시:</span> {new Date(detailRecord.create_dt).toLocaleString('ko-KR')}</div>
              <div>
                <span className="text-gray-400 font-medium">사용자:</span>{' '}
                {detailRecord.user
                  ? `${detailRecord.user.user_nm} (${detailRecord.user.login_id})`
                  : String(detailRecord.user_id ?? '-')}
              </div>
              <div>
                <span className="text-gray-400 font-medium">액션:</span>{' '}
                <Tag color={ACTION_COLORS[detailRecord.action] ?? 'gray'}>
                  {detailRecord.action}
                </Tag>
              </div>
              <div><span className="text-gray-400 font-medium">테이블:</span> {detailRecord.target_table ?? '-'}</div>
              <div><span className="text-gray-400 font-medium">대상ID:</span> {detailRecord.target_id ?? '-'}</div>
              <div className="col-span-2"><span className="text-gray-400 font-medium">IP:</span> {detailRecord.ip_address ?? '-'}</div>
            </div>

            <div className="font-medium mb-2">변경 데이터 비교</div>
            <div className="border border-gray-100 rounded overflow-auto max-h-[400px]">
              {renderJsonDiff(detailRecord.old_values, detailRecord.new_values)}
            </div>
          </>
        )}
      </Modal>
    </div>
  );
}
