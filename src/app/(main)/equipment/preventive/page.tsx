'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import dayjs from 'dayjs';
import Alert from '@/components/ui/Alert';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Drawer from '@/components/ui/Drawer';
import Tag from '@/components/ui/Tag';
import toast from '@/components/ui/toast';
import { confirm } from '@/components/ui/confirm';
import DataGrid, { type DataGridColumn } from '@/components/common/DataGrid';
import MaintenanceCalendar, {
  type MaintPlanCalendarItem,
} from '@/components/equipment/MaintenanceCalendar';
import apiClient from '@/lib/apiClient';

/* ── Types ─────────────────────────────────────────── */

interface MaintPlan {
  maint_plan_id: number;
  equip_cd: string;
  plan_nm: string;
  maint_type_cd?: string;
  cycle_type?: string;
  next_plan_date?: string;
  assignee_id?: number;
  description?: string;
  equipment?: { equip_nm: string };
  assignee?: { worker_nm: string } | null;
  _count?: { plan_dtls: number };
  [key: string]: unknown;
}

/* ── Helpers ─────────────────────────────────────────── */

const CYCLE_TYPE_LABELS: Record<string, string> = {
  DAILY: '매일',
  WEEKLY: '매주',
  MONTHLY: '매월',
  YEARLY: '매년',
};

const MAINT_TYPE_COLORS: Record<string, string> = {
  PM: 'blue',
  CM: 'red',
  BM: 'orange',
};

/* ── Column definitions ─────────────────────────────── */

function buildColumns(
  today: string,
  onResultClick: (plan: MaintPlan) => void,
  onDeleteClick: (plan: MaintPlan) => void,
  onHistoryClick: (plan: MaintPlan) => void,
): DataGridColumn<MaintPlan>[] {
  return [
    {
      title: '보전번호',
      dataIndex: 'maint_plan_id',
      width: 90,
      align: 'center',
    },
    {
      title: '계획명',
      dataIndex: 'plan_nm',
      width: 200,
      ellipsis: true,
      render: (val: unknown) => (val as string) ?? '-',
    },
    {
      title: '설비명',
      dataIndex: 'equipment',
      width: 160,
      ellipsis: true,
      render: (val: unknown) => {
        const eq = val as { equip_nm?: string } | null;
        return eq?.equip_nm ?? '-';
      },
    },
    {
      title: '점검일',
      dataIndex: 'next_plan_date',
      width: 110,
      align: 'center',
      render: (val: unknown) => {
        if (!val) return '-';
        return String(val).slice(0, 10);
      },
    },
    {
      title: '유형',
      dataIndex: 'maint_type_cd',
      width: 80,
      align: 'center',
      render: (val: unknown) => {
        const code = val as string | undefined;
        if (!code) return '-';
        return <Tag color={MAINT_TYPE_COLORS[code] ?? 'gray'}>{code}</Tag>;
      },
    },
    {
      title: '주기',
      dataIndex: 'cycle_type',
      width: 80,
      align: 'center',
      render: (val: unknown) => {
        const code = val as string | undefined;
        return code ? (CYCLE_TYPE_LABELS[code] ?? code) : '-';
      },
    },
    {
      title: '담당자',
      dataIndex: 'assignee',
      width: 110,
      render: (val: unknown) => {
        const assignee = val as { worker_nm?: string } | null;
        return assignee?.worker_nm ?? '-';
      },
    },
    {
      title: '상태',
      dataIndex: 'next_plan_date',
      key: 'status',
      width: 90,
      align: 'center',
      render: (val: unknown) => {
        const dateStr = val ? String(val).slice(0, 10) : undefined;
        if (!dateStr) return <Badge status="default" text="미설정" />;
        const isDue = dateStr <= today;
        return isDue ? (
          <Badge status="warning" text="점검예정" />
        ) : (
          <Badge status="default" text="대기" />
        );
      },
    },
    {
      title: '작업',
      dataIndex: 'action',
      width: 270,
      align: 'center',
      render: (_val: unknown, record: MaintPlan) => {
        const dateStr = record.next_plan_date ? String(record.next_plan_date).slice(0, 10) : undefined;
        const isDue = dateStr ? dateStr <= today : false;
        return (
          <div className="inline-flex items-center gap-1">
            <Button
              size="small"
              variant="primary"
              disabled={!isDue}
              onClick={(e) => {
                e.stopPropagation();
                onResultClick(record);
              }}
            >
              이력등록
            </Button>
            <Button
              size="small"
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation();
                onHistoryClick(record);
              }}
            >
              이력
            </Button>
            <Button
              size="small"
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation();
                onDeleteClick(record);
              }}
            >
              삭제
            </Button>
          </div>
        );
      },
    },
  ];
}

/* ── Component ─────────────────────────────────────── */

export default function PreventivePage() {
  const today = dayjs().format('YYYY-MM-DD');

  /* Plan list state */
  const [plans, setPlans] = useState<MaintPlan[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);

  /* Calendar state */
  const [calendarPlans, setCalendarPlans] = useState<MaintPlanCalendarItem[]>([]);
  const [calendarLoading, setCalendarLoading] = useState(false);
  const [calendarRange, setCalendarRange] = useState<{ start: string; end: string }>({
    start: dayjs().startOf('month').format('YYYY-MM-DD'),
    end: dayjs().endOf('month').format('YYYY-MM-DD'),
  });

  /* Today due count */
  const [todayDueCount, setTodayDueCount] = useState(0);

  /* Drawer state */
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedDatePlans, setSelectedDatePlans] = useState<MaintPlanCalendarItem[]>([]);

  /* Modal state — lazy imports to avoid circular deps */
  const [planModalOpen, setPlanModalOpen] = useState(false);
  const [planModalMode, setPlanModalMode] = useState<'create' | 'edit' | 'view'>('create');
  const [selectedPlan, setSelectedPlan] = useState<MaintPlan | undefined>();
  const [resultModalOpen, setResultModalOpen] = useState(false);
  const [resultTargetPlan, setResultTargetPlan] = useState<MaintPlan | undefined>();

  /* History drawer state */
  const [historyDrawerOpen, setHistoryDrawerOpen] = useState(false);
  const [historyPlan, setHistoryPlan] = useState<MaintPlan | undefined>();
  const [historyResults, setHistoryResults] = useState<Array<Record<string, unknown>>>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  /* ── Fetch today count ─────────────────────────── */
  const fetchTodayCount = useCallback(async () => {
    try {
      const res = await apiClient.get('/v1/maint-plans/today-count');
      setTodayDueCount(res.data?.data?.count ?? 0);
    } catch {
      /* silently ignore */
    }
  }, []);

  /* ── Fetch calendar plans ─────────────────────── */
  const fetchCalendarPlans = useCallback(
    async (start: string, end: string) => {
      setCalendarLoading(true);
      try {
        const res = await apiClient.get('/v1/maint-plans/calendar', {
          params: { start, end },
        });
        setCalendarPlans(Array.isArray(res.data?.data) ? res.data.data : []);
      } catch {
        setCalendarPlans([]);
      } finally {
        setCalendarLoading(false);
      }
    },
    [],
  );

  /* ── Fetch plan list ──────────────────────────── */
  const fetchPlans = useCallback(
    async (p = page, ps = pageSize) => {
      setLoading(true);
      try {
        const res = await apiClient.get('/v1/maint-plans', {
          params: { page: p, limit: ps },
        });
        const { data: rows, pagination } = res.data;
        setPlans(Array.isArray(rows) ? rows : []);
        setTotal(pagination?.total ?? 0);
      } catch {
        setPlans([]);
        setTotal(0);
      } finally {
        setLoading(false);
      }
    },
    [page, pageSize],
  );

  /* ── Initial load ─────────────────────────────── */
  useEffect(() => {
    fetchTodayCount();
    fetchCalendarPlans(calendarRange.start, calendarRange.end);
    fetchPlans();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── Calendar month change ────────────────────── */
  const handleMonthChange = useCallback(
    (start: string, end: string) => {
      setCalendarRange({ start, end });
      fetchCalendarPlans(start, end);
    },
    [fetchCalendarPlans],
  );

  /* ── Calendar date click → Drawer ────────────── */
  const handleDateSelect = useCallback(
    (date: string, dayPlans: MaintPlanCalendarItem[]) => {
      setSelectedDate(date);
      setSelectedDatePlans(dayPlans);
      setDrawerOpen(true);
    },
    [],
  );

  /* ── Today alert click → filter grid ─────────── */
  const handleAlertClick = useCallback(() => {
    setLoading(true);
    apiClient
      .get('/v1/maint-plans', {
        params: { page: 1, limit: pageSize, next_plan_date: today },
      })
      .then((res) => {
        const { data: rows, pagination } = res.data;
        setPlans(Array.isArray(rows) ? rows : []);
        setTotal(pagination?.total ?? 0);
        setPage(1);
      })
      .catch(() => {
        setPlans([]);
        setTotal(0);
      })
      .finally(() => setLoading(false));
  }, [pageSize, today]);

  /* ── Page change ──────────────────────────────── */
  const handlePageChange = useCallback(
    (p: number, ps: number) => {
      setPage(p);
      setPageSize(ps);
      fetchPlans(p, ps);
    },
    [fetchPlans],
  );

  /* ── Plan delete ──────────────────────────────── */
  const handleDeletePlan = useCallback(
    (plan: MaintPlan) => {
      confirm({
        title: '보전계획 삭제',
        content: '이 보전계획을 삭제하면 관련 점검항목도 함께 삭제됩니다. 계속하시겠습니까?',
        danger: true,
        onOk: async () => {
          try {
            await apiClient.delete(`/v1/maint-plans/${plan.maint_plan_id}`);
            toast.success('보전계획이 삭제되었습니다.');
            fetchPlans(1, pageSize);
            fetchCalendarPlans(calendarRange.start, calendarRange.end);
            fetchTodayCount();
            setPage(1);
          } catch (err: unknown) {
            const axiosErr = err as { response?: { data?: { message?: string } } };
            toast.error(
              axiosErr?.response?.data?.message ?? '삭제에 실패했습니다.',
              6000,
            );
          }
        },
      });
    },
    [fetchPlans, pageSize, fetchCalendarPlans, calendarRange, fetchTodayCount],
  );

  /* ── Plan history drawer ──────────────────────── */
  const handleHistoryClick = useCallback(async (plan: MaintPlan) => {
    setHistoryPlan(plan);
    setHistoryDrawerOpen(true);
    setHistoryLoading(true);
    try {
      const res = await apiClient.get('/v1/maint-results', {
        params: { maint_plan_id: plan.maint_plan_id, limit: 100, sort: 'work_dt:desc' },
      });
      const rows = res.data?.data ?? [];
      setHistoryResults(Array.isArray(rows) ? rows : []);
    } catch {
      setHistoryResults([]);
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  /* ── Modal refresh after success ─────────────── */
  const handleModalSuccess = useCallback(() => {
    setPlanModalOpen(false);
    setResultModalOpen(false);
    setSelectedPlan(undefined);
    setResultTargetPlan(undefined);
    fetchPlans(1, pageSize);
    fetchCalendarPlans(calendarRange.start, calendarRange.end);
    fetchTodayCount();
    setPage(1);
  }, [fetchPlans, pageSize, fetchCalendarPlans, calendarRange, fetchTodayCount]);

  /* ── Plan create/edit modal ───────────────────── */
  const handleCreatePlan = useCallback(() => {
    setSelectedPlan(undefined);
    setPlanModalMode('create');
    setPlanModalOpen(true);
  }, []);

  const handleRowDoubleClick = useCallback((record: MaintPlan) => {
    setSelectedPlan(record);
    setPlanModalMode('edit');
    setPlanModalOpen(true);
  }, []);

  /* ── Result modal ─────────────────────────────── */
  const handleResultClick = useCallback((plan: MaintPlan) => {
    setResultTargetPlan(plan);
    setResultModalOpen(true);
  }, []);

  /* ── Drawer date display ─────────────────────── */
  const drawerTitle = selectedDate
    ? dayjs(selectedDate).format('YYYY년 M월 D일') + ' 보전 일정'
    : '보전 일정';

  /* ── Columns ─────────────────────────────────── */
  const columns = buildColumns(today, handleResultClick, handleDeletePlan, handleHistoryClick);

  /* ── Lazy-load modals ─────────────────────────── */
  const [MaintPlanFormModal, setMaintPlanFormModal] = useState<React.ComponentType<{
    open: boolean;
    mode: 'create' | 'edit' | 'view';
    plan?: MaintPlan;
    onOk: () => void;
    onCancel: () => void;
  }> | null>(null);

  const [MaintResultFormModal, setMaintResultFormModal] = useState<React.ComponentType<{
    open: boolean;
    plan?: MaintPlan;
    onOk: () => void;
    onCancel: () => void;
  }> | null>(null);

  useEffect(() => {
    import('@/components/equipment/MaintPlanFormModal').then((mod) => {
      setMaintPlanFormModal(() => mod.default);
    });
    import('@/components/equipment/MaintResultFormModal').then((mod) => {
      setMaintResultFormModal(() => mod.default);
    });
  }, []);

  return (
    <div className="px-6 py-4">
      {/* Today due alert */}
      {todayDueCount > 0 && (
        <div className="mb-4">
          <Alert
            type="warning"
            showIcon
            message={
              <span
                className="cursor-pointer"
                onClick={handleAlertClick}
              >
                오늘 점검 예정: {todayDueCount}건
              </span>
            }
          />
        </div>
      )}

      {/* Stacked layout — calendar on top, full-width plan list below */}
      <MaintenanceCalendar
        plans={calendarPlans}
        onDateSelect={handleDateSelect}
        loading={calendarLoading}
        onMonthChange={handleMonthChange}
      />

      <div className="mt-6">
        <div className="flex items-center justify-between mb-3">
          <h5 className="text-sm font-semibold text-gray-700">보전계획 목록</h5>
          <Button
            variant="primary"
            icon={<Plus className="w-4 h-4" />}
            onClick={handleCreatePlan}
          >
            보전계획 등록
          </Button>
        </div>

        <DataGrid<MaintPlan>
          columns={columns}
          dataSource={plans}
          rowKey="maint_plan_id"
          loading={loading}
          page={page}
          pageSize={pageSize}
          total={total}
          onPageChange={handlePageChange}
          emptyText="등록된 보전계획이 없습니다. 보전계획 등록 버튼을 눌러 첫 일정을 추가해주세요."
          scrollX={1200}
          storageKey="preventive-maint-grid"
          onRow={(record) => ({
            onDoubleClick: () => handleRowDoubleClick(record),
            style: { cursor: 'pointer' },
          })}
        />
      </div>

      {/* Calendar date drawer */}
      <Drawer
        open={drawerOpen}
        title={drawerTitle}
        placement="right"
        width={480}
        onClose={() => setDrawerOpen(false)}
      >
        {selectedDatePlans.length === 0 ? (
          <p className="text-gray-400">
            이 날짜에 예정된 보전계획이 없습니다.
          </p>
        ) : (
          <div className="space-y-3">
            {selectedDatePlans.map((item) => {
              const isDue = String(item.next_plan_date).slice(0, 10) <= today;
              return (
                <div key={item.maint_plan_id} className="border-b border-gray-100 pb-3">
                  <div className="font-medium">{item.plan_nm}</div>
                  <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                    <span>{item.equipment?.equip_nm ?? '-'}</span>
                    {item.maint_type_cd && (
                      <Tag color="blue">{item.maint_type_cd}</Tag>
                    )}
                    {item.assignee?.worker_nm && (
                      <span>{item.assignee.worker_nm}</span>
                    )}
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    {isDue && (
                      <Button
                        size="small"
                        variant="primary"
                        onClick={() => {
                          setDrawerOpen(false);
                          handleResultClick(item as unknown as MaintPlan);
                        }}
                      >
                        보전이력 등록
                      </Button>
                    )}
                    <Button
                      size="small"
                      variant="ghost"
                      onClick={() => {
                        setDrawerOpen(false);
                        handleHistoryClick(item as unknown as MaintPlan);
                      }}
                    >
                      이력 보기
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Drawer>

      {/* History drawer — past maint results for a given plan */}
      <Drawer
        open={historyDrawerOpen}
        title={historyPlan ? `보전이력 — ${historyPlan.plan_nm}` : '보전이력'}
        placement="right"
        width={520}
        onClose={() => setHistoryDrawerOpen(false)}
      >
        {historyLoading ? (
          <p className="text-gray-400">불러오는 중…</p>
        ) : historyResults.length === 0 ? (
          <p className="text-gray-400">등록된 보전이력이 없습니다.</p>
        ) : (
          <div className="space-y-3">
            {historyResults.map((r) => {
              const workDt = r.work_dt ? String(r.work_dt).slice(0, 10) : '-';
              const worker = (r.worker as { worker_nm?: string } | null)?.worker_nm;
              const maintType = r.maint_type_cd as string | undefined;
              const cost = r.cost as number | string | undefined;
              const memo = r.memo as string | undefined;
              const maintNo = r.maint_no as string | undefined;
              return (
                <div key={r.maint_result_id as number} className="border border-gray-100 rounded-lg p-2.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-gray-700 text-[13px]">{workDt}</span>
                    {maintType && <Tag color="blue">{maintType}</Tag>}
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-gray-500">
                    <span>작업자:</span>
                    <span className="text-gray-700">{worker ?? '-'}</span>
                  </div>
                  {(cost !== undefined && cost !== null && cost !== '') && (
                    <div className="mt-1 text-gray-500">
                      비용: <span className="text-gray-700">{Number(cost).toLocaleString()}</span>
                    </div>
                  )}
                  {memo && (
                    <div className="mt-1 text-gray-500">
                      메모: <span className="text-gray-700">{memo}</span>
                    </div>
                  )}
                  {maintNo && (
                    <div className="mt-1 text-[11px] text-gray-400">#{maintNo}</div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Drawer>

      {/* Maintenance Plan Form Modal */}
      {MaintPlanFormModal && (
        <MaintPlanFormModal
          open={planModalOpen}
          mode={planModalMode}
          plan={selectedPlan}
          onOk={handleModalSuccess}
          onCancel={() => {
            setPlanModalOpen(false);
            setSelectedPlan(undefined);
          }}
        />
      )}

      {/* Maintenance Result Form Modal */}
      {MaintResultFormModal && (
        <MaintResultFormModal
          open={resultModalOpen}
          plan={resultTargetPlan}
          onOk={handleModalSuccess}
          onCancel={() => {
            setResultModalOpen(false);
            setResultTargetPlan(undefined);
          }}
        />
      )}
    </div>
  );
}
