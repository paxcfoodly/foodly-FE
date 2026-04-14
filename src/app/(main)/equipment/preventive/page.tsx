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
): DataGridColumn<MaintPlan>[] {
  return [
    {
      title: '보전번호',
      dataIndex: 'maint_plan_id',
      width: 90,
      align: 'center',
    },
    {
      title: '설비명',
      dataIndex: 'equipment',
      width: 150,
      ellipsis: true,
      render: (val: unknown) => {
        const eq = val as { equip_nm?: string } | null;
        return eq?.equip_nm ?? '-';
      },
    },
    {
      title: '보전유형',
      dataIndex: 'maint_type_cd',
      width: 90,
      align: 'center',
      render: (val: unknown) => {
        const code = val as string | undefined;
        if (!code) return '-';
        return <Tag color={MAINT_TYPE_COLORS[code] ?? 'gray'}>{code}</Tag>;
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
      title: '주기',
      dataIndex: 'cycle_type',
      width: 80,
      align: 'center',
      render: (val: unknown) => {
        const cycle = val as string | undefined;
        return cycle ? (CYCLE_TYPE_LABELS[cycle] ?? cycle) : '-';
      },
    },
    {
      title: '담당자',
      dataIndex: 'assignee',
      width: 100,
      render: (val: unknown) => {
        const assignee = val as { worker_nm?: string } | null;
        return assignee?.worker_nm ?? '-';
      },
    },
    {
      title: '완료여부',
      dataIndex: 'next_plan_date',
      width: 90,
      align: 'center',
      render: (val: unknown) => {
        const dateStr = val as string | undefined;
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
      width: 110,
      align: 'center',
      render: (_val: unknown, record: MaintPlan) => {
        const dateStr = record.next_plan_date;
        const isDue = dateStr ? dateStr <= today : false;
        return (
          <Button
            size="small"
            variant="primary"
            disabled={!isDue}
            onClick={(e) => {
              e.stopPropagation();
              onResultClick(record);
            }}
          >
            보전이력 등록
          </Button>
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
            );
          }
        },
      });
    },
    [fetchPlans, pageSize, fetchCalendarPlans, calendarRange, fetchTodayCount],
  );

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
  const columns = buildColumns(today, handleResultClick);

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

      {/* Two-panel split layout */}
      <div className="flex gap-4">
        {/* Left panel: Calendar (60%) */}
        <div className="w-[60%] min-w-0">
          <MaintenanceCalendar
            plans={calendarPlans}
            onDateSelect={handleDateSelect}
            loading={calendarLoading}
            onMonthChange={handleMonthChange}
          />
        </div>

        {/* Right panel: Plan list (40%) */}
        <div className="w-[40%] min-w-0">
          {/* Toolbar */}
          <div className="mb-3">
            <Button
              variant="primary"
              icon={<Plus className="w-4 h-4" />}
              onClick={handleCreatePlan}
            >
              보전계획 등록
            </Button>
          </div>

          {/* Plan DataGrid */}
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
            scrollX={800}
            onRow={(record) => ({
              onDoubleClick: () => handleRowDoubleClick(record),
              style: { cursor: 'pointer' },
            })}
          />
        </div>
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
              const isDue = item.next_plan_date <= today;
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
                  {isDue && (
                    <div className="mt-2">
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
                    </div>
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
