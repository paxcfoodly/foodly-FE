'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Clock } from 'lucide-react';
import Drawer from '@/components/ui/Drawer';
import Spinner from '@/components/ui/Spinner';
import Empty from '@/components/ui/Empty';
import Tag from '@/components/ui/Tag';
import dayjs from 'dayjs';
import apiClient from '@/lib/apiClient';
import type { PaginationMeta } from '@/types';

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

const ACTION_COLOR: Record<string, 'green' | 'blue' | 'red'> = {
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
      <div className="mt-1">
        {changes.map((c, i) => (
          <div key={i} className="text-xs text-gray-500 mb-0.5">
            <span className="font-semibold text-xs">{c.column}</span>
            {': '}
            <span className="line-through text-gray-400 text-xs">
              {c.oldValue ?? '(없음)'}
            </span>
            {' → '}
            <span className="text-blue-600 text-xs">
              {c.newValue ?? '(없음)'}
            </span>
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
    >
      <Spinner spinning={loading}>
        {items.length === 0 && !loading ? (
          <Empty description="변경 이력이 없습니다." />
        ) : (
          <>
            {/* Timeline as a simple list */}
            <div className="relative pl-6">
              {/* Vertical line */}
              <div className="absolute left-[9px] top-0 bottom-0 w-px bg-dark-500" />

              {items.map((item) => (
                <div key={item.id} className="relative pb-6 last:pb-0">
                  {/* Dot */}
                  <div className="absolute left-[-15px] top-0.5 w-5 h-5 rounded-full bg-white border-2 border-dark-500 flex items-center justify-center">
                    <Clock className="w-3 h-3 text-gray-400" />
                  </div>

                  {/* Content */}
                  <div className="ml-2">
                    <div className="flex items-center gap-2 mb-1">
                      <Tag color={ACTION_COLOR[item.action] ?? 'gray'}>
                        {ACTION_LABEL[item.action] ?? item.action}
                      </Tag>
                      <span className="text-xs text-gray-400">
                        {dayjs(item.changed_at).format('YYYY-MM-DD HH:mm:ss')}
                      </span>
                      {item.changed_by && (
                        <span className="text-xs text-gray-600 ml-1">
                          by {item.changed_by}
                        </span>
                      )}
                    </div>
                    {renderChanges(item.changed_columns)}
                    {item.remark && (
                      <p className="text-[11px] text-gray-400">{item.remark}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Simple pagination */}
            {pagination.totalPages > 1 && (
              <div className="flex justify-center items-center gap-1 mt-6">
                {Array.from({ length: pagination.totalPages }, (_, i) => i + 1)
                  .slice(
                    Math.max(0, pagination.page - 3),
                    pagination.page + 2,
                  )
                  .map((p) => (
                    <button
                      key={p}
                      onClick={() => handlePageChange(p)}
                      className={`
                        w-7 h-7 rounded text-xs font-medium transition-colors
                        ${p === pagination.page
                          ? 'bg-cyan-accent text-white'
                          : 'text-gray-600 hover:bg-dark-700'}
                      `}
                    >
                      {p}
                    </button>
                  ))}
              </div>
            )}
          </>
        )}
      </Spinner>
    </Drawer>
  );
}
