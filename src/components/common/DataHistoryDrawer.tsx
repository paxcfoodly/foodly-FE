'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Drawer, Timeline, Spin, Empty, Tag, Typography, Pagination } from 'antd';
import { ClockCircleOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import apiClient from '@/lib/apiClient';
import type { PaginationMeta } from '@/types';

const { Text } = Typography;

/* ── Types ─────────────────────────────────────────── */

interface ColumnChange {
  column: string;
  oldValue: string | null;
  newValue: string | null;
}

interface HistoryRecord {
  id: number;
  table_nm: string;
  record_id: string;
  action: 'INSERT' | 'UPDATE' | 'DELETE';
  changed_columns: ColumnChange[] | null;
  changed_by: string | null;
  changed_at: string;
  remark: string | null;
}

export interface DataHistoryDrawerProps {
  /** 드로어 열림 여부 */
  open: boolean;
  /** 닫기 콜백 */
  onClose: () => void;
  /** 대상 테이블명 */
  tableName: string;
  /** 대상 레코드 ID */
  recordId: string;
  /** 드로어 제목 (기본 '변경 이력') */
  title?: string;
  /** 드로어 너비 (기본 520) */
  width?: number;
}

/* ── Action Tag Color ────────────────────────────── */

const ACTION_COLOR: Record<string, string> = {
  INSERT: 'green',
  UPDATE: 'blue',
  DELETE: 'red',
};

const ACTION_LABEL: Record<string, string> = {
  INSERT: '등록',
  UPDATE: '수정',
  DELETE: '삭제',
};

/* ── Component ────────────────────────────────────── */

export default function DataHistoryDrawer({
  open,
  onClose,
  tableName,
  recordId,
  title = '변경 이력',
  width = 520,
}: DataHistoryDrawerProps) {
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<HistoryRecord[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta>({
    page: 1,
    pageSize: 20,
    total: 0,
    totalPages: 0,
  });

  const fetchHistory = useCallback(
    async (page: number) => {
      if (!tableName || !recordId) return;
      try {
        setLoading(true);
        const res = await apiClient.get('/v1/data-history', {
          params: { table: tableName, recordId, page, limit: 20 },
        });
        const body = res.data;
        setItems(body.data ?? []);
        if (body.pagination) {
          setPagination(body.pagination);
        }
      } catch (err: any) {
        console.error('[DataHistoryDrawer]', err);
        setItems([]);
      } finally {
        setLoading(false);
      }
    },
    [tableName, recordId],
  );

  useEffect(() => {
    if (open) {
      fetchHistory(1);
    }
  }, [open, fetchHistory]);

  const handlePageChange = useCallback(
    (page: number) => {
      fetchHistory(page);
    },
    [fetchHistory],
  );

  /* 변경 컬럼 렌더링 */
  const renderChanges = (changes: ColumnChange[] | null) => {
    if (!changes || changes.length === 0) return null;
    return (
      <div style={{ marginTop: 4 }}>
        {changes.map((c, i) => (
          <div key={i} style={{ fontSize: 12, color: '#666', marginBottom: 2 }}>
            <Text strong style={{ fontSize: 12 }}>
              {c.column}
            </Text>
            {': '}
            <Text delete type="secondary" style={{ fontSize: 12 }}>
              {c.oldValue ?? '(없음)'}
            </Text>
            {' → '}
            <Text style={{ fontSize: 12, color: '#1677ff' }}>
              {c.newValue ?? '(없음)'}
            </Text>
          </div>
        ))}
      </div>
    );
  };

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={title}
      width={width}
      destroyOnClose
    >
      <Spin spinning={loading}>
        {items.length === 0 && !loading ? (
          <Empty description="변경 이력이 없습니다." />
        ) : (
          <>
            <Timeline
              items={items.map((item) => ({
                dot: <ClockCircleOutlined style={{ fontSize: 14 }} />,
                children: (
                  <div>
                    <div style={{ marginBottom: 4 }}>
                      <Tag color={ACTION_COLOR[item.action] ?? 'default'}>
                        {ACTION_LABEL[item.action] ?? item.action}
                      </Tag>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {dayjs(item.changed_at).format('YYYY-MM-DD HH:mm:ss')}
                      </Text>
                      {item.changed_by && (
                        <Text style={{ fontSize: 12, marginLeft: 8 }}>
                          by {item.changed_by}
                        </Text>
                      )}
                    </div>
                    {renderChanges(item.changed_columns)}
                    {item.remark && (
                      <Text type="secondary" style={{ fontSize: 11 }}>
                        {item.remark}
                      </Text>
                    )}
                  </div>
                ),
              }))}
            />
            {pagination.totalPages > 1 && (
              <div style={{ textAlign: 'center', marginTop: 16 }}>
                <Pagination
                  size="small"
                  current={pagination.page}
                  total={pagination.total}
                  pageSize={pagination.pageSize}
                  onChange={handlePageChange}
                  showSizeChanger={false}
                />
              </div>
            )}
          </>
        )}
      </Spin>
    </Drawer>
  );
}
