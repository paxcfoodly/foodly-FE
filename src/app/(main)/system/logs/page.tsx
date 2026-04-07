'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Tag, Modal, Descriptions, message } from 'antd';
import { EyeOutlined } from '@ant-design/icons';
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
  LOGOUT: 'default',
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
      message.error(err?.response?.data?.message ?? '감사로그 조회에 실패했습니다.');
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
          return <Tag color={ACTION_COLORS[action] ?? 'default'}>{action}</Tag>;
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
          <a onClick={() => setDetailRecord(record)}>
            <EyeOutlined /> 보기
          </a>
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
      if (!oldVals && !newVals) return <span style={{ color: '#999' }}>변경 데이터 없음</span>;

      const allKeys = new Set([
        ...Object.keys(oldVals ?? {}),
        ...Object.keys(newVals ?? {}),
      ]);

      return (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #f0f0f0' }}>
              <th style={{ padding: '6px 8px', textAlign: 'left' }}>필드</th>
              <th style={{ padding: '6px 8px', textAlign: 'left' }}>변경 전</th>
              <th style={{ padding: '6px 8px', textAlign: 'left' }}>변경 후</th>
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
                  style={{
                    borderBottom: '1px solid #f0f0f0',
                    backgroundColor: changed ? '#fffbe6' : undefined,
                  }}
                >
                  <td style={{ padding: '4px 8px', fontWeight: 500 }}>{key}</td>
                  <td
                    style={{
                      padding: '4px 8px',
                      color: changed ? '#ff4d4f' : '#666',
                      wordBreak: 'break-all',
                    }}
                  >
                    {oldVal !== undefined ? JSON.stringify(oldVal) : '-'}
                  </td>
                  <td
                    style={{
                      padding: '4px 8px',
                      color: changed ? '#52c41a' : '#666',
                      wordBreak: 'break-all',
                    }}
                  >
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
    <div style={{ padding: 0 }}>
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
        onCancel={() => setDetailRecord(null)}
        footer={null}
      >
        {detailRecord && (
          <>
            <Descriptions bordered size="small" column={2} style={{ marginBottom: 16 }}>
              <Descriptions.Item label="로그ID">{detailRecord.log_id}</Descriptions.Item>
              <Descriptions.Item label="일시">
                {new Date(detailRecord.create_dt).toLocaleString('ko-KR')}
              </Descriptions.Item>
              <Descriptions.Item label="사용자">
                {detailRecord.user
                  ? `${detailRecord.user.user_nm} (${detailRecord.user.login_id})`
                  : String(detailRecord.user_id ?? '-')}
              </Descriptions.Item>
              <Descriptions.Item label="액션">
                <Tag color={ACTION_COLORS[detailRecord.action] ?? 'default'}>
                  {detailRecord.action}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="테이블">
                {detailRecord.target_table ?? '-'}
              </Descriptions.Item>
              <Descriptions.Item label="대상ID">
                {detailRecord.target_id ?? '-'}
              </Descriptions.Item>
              <Descriptions.Item label="IP" span={2}>
                {detailRecord.ip_address ?? '-'}
              </Descriptions.Item>
            </Descriptions>

            <div style={{ fontWeight: 500, marginBottom: 8 }}>변경 데이터 비교</div>
            <div style={{ border: '1px solid #f0f0f0', borderRadius: 4, overflow: 'auto', maxHeight: 400 }}>
              {renderJsonDiff(detailRecord.old_values, detailRecord.new_values)}
            </div>
          </>
        )}
      </Modal>
    </div>
  );
}
