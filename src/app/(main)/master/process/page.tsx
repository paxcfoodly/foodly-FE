'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Plus,
  Pencil,
  Trash2,
  History,
  Wrench,
  GitBranch,
} from 'lucide-react';
import Button from '@/components/ui/Button';
import Tag from '@/components/ui/Tag';
import Drawer from '@/components/ui/Drawer';
import Table from '@/components/ui/Table';
import type { TableColumn, PaginationConfig } from '@/components/ui/Table';
import toast from '@/components/ui/toast';
import { confirm } from '@/components/ui/confirm';
import { Section, Row } from '@/components/ui/Section';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import PermissionButton from '@/components/auth/PermissionButton';
import FormModal, { type FormModalMode } from '@/components/common/FormModal';
import SearchForm, { type SearchFieldDef } from '@/components/common/SearchForm';
import ExcelUploadButton from '@/components/common/ExcelUploadButton';
import ExcelDownloadButton, { type ExcelColumn } from '@/components/common/ExcelDownloadButton';
import DataHistoryDrawer from '@/components/common/DataHistoryDrawer';
import apiClient from '@/lib/apiClient';
import type { PaginatedResponse } from '@/types';
import dayjs from 'dayjs';

/* ── Types ─────────────────────────────────────────── */

interface ProcessRow {
  process_cd: string;
  process_nm: string;
  process_type: string | null;
  std_time: string | number | null;
  workshop_cd: string | null;
  use_yn: string;
  create_by: string | null;
  create_dt: string;
  update_by: string | null;
  update_dt: string | null;
  [key: string]: unknown;
}

interface ProcessFormValues {
  process_cd: string;
  process_nm: string;
  process_type?: string | null;
  std_time?: number | null;
  workshop_cd?: string | null;
  use_yn?: string;
  [key: string]: unknown;
}

interface RoutingRow {
  routing_id: number;
  item_cd: string;
  process_cd: string;
  seq_no: number;
  std_time: string | number | null;
  setup_time: string | number | null;
  use_yn: string;
  process: { process_nm: string };
  [key: string]: unknown;
}

interface EquipMappingRow {
  equip_cd: string;
  process_cd: string;
  priority: number;
  equipment: { equip_nm: string; equip_type: string | null };
  [key: string]: unknown;
}

const MENU_URL = '/master/process';

const PROCESS_TYPE_OPTIONS = [
  { label: '기계가공', value: 'MACHINING' },
  { label: '조립', value: 'ASSY' },
  { label: '검사', value: 'INSP' },
  { label: '포장', value: 'PKG' },
];

const PROCESS_TYPE_LABEL: Record<string, string> = {
  MACHINING: '기계가공',
  ASSY: '조립',
  INSP: '검사',
  PKG: '포장',
};

const PROCESS_TYPE_COLOR: Record<string, string> = {
  MACHINING: 'blue',
  ASSY: 'orange',
  INSP: 'purple',
  PKG: 'green',
};

const USE_YN_OPTIONS = [
  { label: '사용', value: 'Y' },
  { label: '미사용', value: 'N' },
];

/* ── Excel columns ─── */
const EXCEL_COLUMNS: ExcelColumn[] = [
  { header: '공정코드', key: 'process_cd', width: 15 },
  { header: '공정명', key: 'process_nm', width: 25 },
  { header: '공정유형', key: 'process_type', width: 12 },
  { header: '표준시간', key: 'std_time', width: 10 },
  { header: '작업장코드', key: 'workshop_cd', width: 15 },
  { header: '사용여부', key: 'use_yn', width: 8 },
];

/* ── Search fields ─── */
const SEARCH_FIELDS: SearchFieldDef[] = [
  { name: 'process_cd', label: '공정코드', type: 'text', placeholder: '공정코드 입력' },
  { name: 'process_nm', label: '공정명', type: 'text', placeholder: '공정명 입력' },
  {
    name: 'process_type',
    label: '공정유형',
    type: 'select',
    options: [{ label: '전체', value: '' }, ...PROCESS_TYPE_OPTIONS],
  },
  {
    name: 'use_yn',
    label: '사용여부',
    type: 'select',
    options: [{ label: '전체', value: '' }, ...USE_YN_OPTIONS],
  },
];

/* ── Component ─────────────────────────────────────── */

export default function ProcessMasterPage() {
  /* ── State ─── */
  const [processes, setProcesses] = useState<ProcessRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 20, total: 0 });
  const [sortField, setSortField] = useState<string | undefined>();
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc' | undefined>();
  const [filters, setFilters] = useState<Record<string, unknown>>({});

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<FormModalMode>('create');
  const [editProcess, setEditProcess] = useState<ProcessRow | null>(null);

  // History drawer
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyProcessCd, setHistoryProcessCd] = useState('');

  // Routing drawer
  const [routingOpen, setRoutingOpen] = useState(false);
  const [routingItemCd, setRoutingItemCd] = useState('');
  const [routingItemCdInput, setRoutingItemCdInput] = useState('');
  const [routings, setRoutings] = useState<RoutingRow[]>([]);
  const [routingLoading, setRoutingLoading] = useState(false);

  // Equipment mapping drawer
  const [equipOpen, setEquipOpen] = useState(false);
  const [equipProcessCd, setEquipProcessCd] = useState('');
  const [equipMappings, setEquipMappings] = useState<EquipMappingRow[]>([]);
  const [equipLoading, setEquipLoading] = useState(false);
  const [newEquipCd, setNewEquipCd] = useState('');
  const [newEquipPriority, setNewEquipPriority] = useState<number>(1);

  /* ── Data Fetching ─── */
  const fetchProcesses = useCallback(
    async (
      page = pagination.page,
      pageSize = pagination.pageSize,
      sort?: string,
      order?: 'asc' | 'desc',
      searchFilters?: Record<string, unknown>,
    ) => {
      setLoading(true);
      try {
        const params: Record<string, unknown> = { page, limit: pageSize };
        const activeFilters = searchFilters ?? filters;
        if (sort) params.sortBy = sort;
        if (order) params.sortOrder = order;
        Object.entries(activeFilters).forEach(([key, val]) => {
          if (val !== undefined && val !== null && val !== '') params[key] = val;
        });

        const res = await apiClient.get<PaginatedResponse<ProcessRow>>('/v1/processes', { params });
        const body = res.data;
        setProcesses(body.data ?? []);
        if (body.pagination) {
          setPagination({
            page: body.pagination.page,
            pageSize: body.pagination.pageSize,
            total: body.pagination.total,
          });
        }
      } catch (err: any) {
        toast.error(err?.response?.data?.message ?? '공정 목록 조회에 실패했습니다.');
      } finally {
        setLoading(false);
      }
    },
    [filters, pagination.page, pagination.pageSize],
  );

  useEffect(() => {
    fetchProcesses(1, pagination.pageSize, sortField, sortOrder, filters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── Search handler ─── */
  const handleSearch = useCallback(
    (values: Record<string, unknown>) => {
      setFilters(values);
      setPagination((prev) => ({ ...prev, page: 1 }));
      fetchProcesses(1, pagination.pageSize, sortField, sortOrder, values);
    },
    [fetchProcesses, pagination.pageSize, sortField, sortOrder],
  );

  const handleSearchReset = useCallback(() => {
    setFilters({});
    setPagination((prev) => ({ ...prev, page: 1 }));
    fetchProcesses(1, pagination.pageSize, sortField, sortOrder, {});
  }, [fetchProcesses, pagination.pageSize, sortField, sortOrder]);

  /* ── Sort / Page change ─── */
  const handleSortChange = useCallback(
    (field: string, order: 'asc' | 'desc') => {
      setSortField(field);
      setSortOrder(order);
      fetchProcesses(pagination.page, pagination.pageSize, field, order, filters);
    },
    [fetchProcesses, pagination.page, pagination.pageSize, filters],
  );

  const handlePageChange = useCallback(
    (page: number, pageSize: number) => {
      setPagination((prev) => ({ ...prev, page, pageSize }));
      fetchProcesses(page, pageSize, sortField, sortOrder, filters);
    },
    [fetchProcesses, sortField, sortOrder, filters],
  );

  /* ── CRUD handlers ─── */
  const handleCreate = useCallback(() => {
    setEditProcess(null);
    setModalMode('create');
    setModalOpen(true);
  }, []);

  const handleEdit = useCallback((record: ProcessRow) => {
    setEditProcess(record);
    setModalMode('edit');
    setModalOpen(true);
  }, []);

  const handleSubmit = useCallback(
    async (values: ProcessFormValues, mode: FormModalMode) => {
      if (mode === 'create') {
        await apiClient.post('/v1/processes', {
          process_cd: values.process_cd,
          process_nm: values.process_nm,
          process_type: values.process_type || null,
          std_time: values.std_time ?? null,
          workshop_cd: values.workshop_cd || null,
        });
      } else {
        await apiClient.put(`/v1/processes/${editProcess!.process_cd}`, {
          process_nm: values.process_nm,
          process_type: values.process_type || null,
          std_time: values.std_time ?? null,
          workshop_cd: values.workshop_cd || null,
          use_yn: values.use_yn,
        });
      }
      fetchProcesses(pagination.page, pagination.pageSize, sortField, sortOrder, filters);
    },
    [editProcess, fetchProcesses, pagination.page, pagination.pageSize, sortField, sortOrder, filters],
  );

  const handleDelete = useCallback(
    async (record: ProcessRow) => {
      try {
        await apiClient.delete(`/v1/processes/${record.process_cd}`);
        toast.success('공정이 삭제되었습니다.');
        fetchProcesses(pagination.page, pagination.pageSize, sortField, sortOrder, filters);
      } catch (err: any) {
        toast.error(err?.response?.data?.message ?? '삭제에 실패했습니다.');
      }
    },
    [fetchProcesses, pagination.page, pagination.pageSize, sortField, sortOrder, filters],
  );

  /* ── History handler ─── */
  const handleHistory = useCallback((record: ProcessRow) => {
    setHistoryProcessCd(record.process_cd);
    setHistoryOpen(true);
  }, []);

  /* ── Excel ─── */
  const fetchExcelData = useCallback(async () => {
    const res = await apiClient.get<PaginatedResponse<ProcessRow>>('/v1/processes/export');
    return (res.data?.data ?? []) as Record<string, unknown>[];
  }, []);

  /* ── Modal initial values ─── */
  const modalInitialValues = useMemo(() => {
    if (!editProcess) return undefined;
    return {
      process_cd: editProcess.process_cd,
      process_nm: editProcess.process_nm,
      process_type: editProcess.process_type ?? undefined,
      std_time: editProcess.std_time != null ? Number(editProcess.std_time) : undefined,
      workshop_cd: editProcess.workshop_cd ?? undefined,
      use_yn: editProcess.use_yn,
    } as Partial<ProcessFormValues>;
  }, [editProcess]);

  /* ── Routing drawer handlers ─── */
  const fetchRoutings = useCallback(async (itemCd: string) => {
    if (!itemCd) return;
    setRoutingLoading(true);
    try {
      const res = await apiClient.get('/v1/routings', { params: { item_cd: itemCd } });
      setRoutings(res.data?.data ?? []);
      setRoutingItemCd(itemCd);
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? '라우팅 조회에 실패했습니다.');
    } finally {
      setRoutingLoading(false);
    }
  }, []);

  const handleOpenRouting = useCallback(() => {
    setRoutingItemCdInput('');
    setRoutingItemCd('');
    setRoutings([]);
    setRoutingOpen(true);
  }, []);

  const handleRoutingSearch = useCallback(() => {
    if (routingItemCdInput.trim()) {
      fetchRoutings(routingItemCdInput.trim());
    }
  }, [routingItemCdInput, fetchRoutings]);

  const handleDeleteRouting = useCallback(
    async (routingId: number) => {
      try {
        await apiClient.delete(`/v1/routings/${routingId}`);
        toast.success('라우팅이 삭제되었습니다.');
        if (routingItemCd) fetchRoutings(routingItemCd);
      } catch (err: any) {
        toast.error(err?.response?.data?.message ?? '삭제에 실패했습니다.');
      }
    },
    [routingItemCd, fetchRoutings],
  );

  // New routing entry state
  const [newRoutingProcessCd, setNewRoutingProcessCd] = useState('');
  const [newRoutingSeqNo, setNewRoutingSeqNo] = useState<number>(10);
  const [newRoutingStdTime, setNewRoutingStdTime] = useState<number | null>(null);
  const [newRoutingSetupTime, setNewRoutingSetupTime] = useState<number | null>(null);

  const handleAddRouting = useCallback(async () => {
    if (!routingItemCd || !newRoutingProcessCd) {
      toast.warning('품목코드와 공정코드를 입력하세요.');
      return;
    }
    try {
      await apiClient.post('/v1/routings', {
        item_cd: routingItemCd,
        process_cd: newRoutingProcessCd,
        seq_no: newRoutingSeqNo,
        std_time: newRoutingStdTime,
        setup_time: newRoutingSetupTime,
      });
      toast.success('라우팅이 추가되었습니다.');
      setNewRoutingProcessCd('');
      setNewRoutingSeqNo((routings.length + 1) * 10);
      setNewRoutingStdTime(null);
      setNewRoutingSetupTime(null);
      fetchRoutings(routingItemCd);
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? '추가에 실패했습니다.');
    }
  }, [routingItemCd, newRoutingProcessCd, newRoutingSeqNo, newRoutingStdTime, newRoutingSetupTime, routings.length, fetchRoutings]);

  const routingColumns: TableColumn<RoutingRow>[] = useMemo(
    () => [
      { title: '순서', dataIndex: 'seq_no', width: 60, align: 'center' },
      { title: '공정코드', dataIndex: 'process_cd', width: 120 },
      {
        title: '공정명',
        dataIndex: 'process_cd',
        key: 'process_nm',
        width: 150,
        render: (_: unknown, record: RoutingRow) => (record as any).process?.process_nm ?? '-',
      },
      {
        title: '표준시간',
        dataIndex: 'std_time',
        width: 90,
        align: 'right',
        render: (val: unknown) => (val != null ? Number(val) : '-'),
      },
      {
        title: '준비시간',
        dataIndex: 'setup_time',
        width: 90,
        align: 'right',
        render: (val: unknown) => (val != null ? Number(val) : '-'),
      },
      {
        title: '사용',
        dataIndex: 'use_yn',
        width: 60,
        align: 'center',
        render: (val: unknown) => (
          <Tag color={(val as string) === 'Y' ? 'green' : 'default'}>
            {(val as string) === 'Y' ? 'Y' : 'N'}
          </Tag>
        ),
      },
      {
        title: '',
        dataIndex: '_action',
        width: 50,
        align: 'center',
        render: (_: unknown, record: RoutingRow) => (
          <Button
            size="small"
            variant="ghost"
            className="text-red-500"
            icon={<Trash2 className="w-4 h-4" />}
            onClick={() =>
              confirm({
                title: '삭제하시겠습니까?',
                onOk: () => handleDeleteRouting(record.routing_id),
                okText: '삭제',
                danger: true,
              })
            }
          />
        ),
      },
    ],
    [handleDeleteRouting],
  );

  /* ── Equipment mapping drawer handlers ─── */
  const fetchEquipMappings = useCallback(async (processCd: string) => {
    setEquipLoading(true);
    try {
      const res = await apiClient.get(`/v1/processes/${processCd}/equipments`);
      setEquipMappings(res.data?.data ?? []);
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? '설비 매핑 조회에 실패했습니다.');
    } finally {
      setEquipLoading(false);
    }
  }, []);

  const handleOpenEquip = useCallback(
    (record: ProcessRow) => {
      setEquipProcessCd(record.process_cd);
      setNewEquipCd('');
      setNewEquipPriority(1);
      setEquipOpen(true);
      fetchEquipMappings(record.process_cd);
    },
    [fetchEquipMappings],
  );

  const handleAddEquipMapping = useCallback(async () => {
    if (!newEquipCd) {
      toast.warning('설비코드를 입력하세요.');
      return;
    }
    try {
      await apiClient.post(`/v1/processes/${equipProcessCd}/equipments`, {
        equip_cd: newEquipCd,
        priority: newEquipPriority,
      });
      toast.success('설비 매핑이 추가되었습니다.');
      setNewEquipCd('');
      setNewEquipPriority(1);
      fetchEquipMappings(equipProcessCd);
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? '추가에 실패했습니다.');
    }
  }, [equipProcessCd, newEquipCd, newEquipPriority, fetchEquipMappings]);

  const handleRemoveEquipMapping = useCallback(
    async (equipCd: string) => {
      try {
        await apiClient.delete(`/v1/processes/${equipProcessCd}/equipments/${equipCd}`);
        toast.success('설비 매핑이 삭제되었습니다.');
        fetchEquipMappings(equipProcessCd);
      } catch (err: any) {
        toast.error(err?.response?.data?.message ?? '삭제에 실패했습니다.');
      }
    },
    [equipProcessCd, fetchEquipMappings],
  );

  const equipColumns: TableColumn<EquipMappingRow>[] = useMemo(
    () => [
      { title: '설비코드', dataIndex: 'equip_cd', width: 120 },
      {
        title: '설비명',
        dataIndex: 'equip_cd',
        key: 'equip_nm',
        width: 150,
        render: (_: unknown, record: EquipMappingRow) => (record as any).equipment?.equip_nm ?? '-',
      },
      {
        title: '설비유형',
        dataIndex: 'equip_cd',
        key: 'equip_type',
        width: 100,
        render: (_: unknown, record: EquipMappingRow) => (record as any).equipment?.equip_type ?? '-',
      },
      { title: '우선순위', dataIndex: 'priority', width: 80, align: 'center' },
      {
        title: '',
        dataIndex: '_action',
        width: 50,
        align: 'center',
        render: (_: unknown, record: EquipMappingRow) => (
          <Button
            size="small"
            variant="ghost"
            className="text-red-500"
            icon={<Trash2 className="w-4 h-4" />}
            onClick={() =>
              confirm({
                title: '매핑을 삭제하시겠습니까?',
                onOk: () => handleRemoveEquipMapping(record.equip_cd),
                okText: '삭제',
                danger: true,
              })
            }
          />
        ),
      },
    ],
    [handleRemoveEquipMapping],
  );

  /* ── Table columns ─── */
  const columns: TableColumn<ProcessRow>[] = useMemo(
    () => [
      { title: '공정코드', dataIndex: 'process_cd', width: 120, sorter: true, ellipsis: true },
      { title: '공정명', dataIndex: 'process_nm', width: 180, sorter: true, ellipsis: true },
      {
        title: '공정유형',
        dataIndex: 'process_type',
        width: 100,
        align: 'center',
        sorter: true,
        render: (val: unknown) => {
          const v = val as string;
          if (!v) return '-';
          return <Tag color={PROCESS_TYPE_COLOR[v] ?? 'default'}>{PROCESS_TYPE_LABEL[v] ?? v}</Tag>;
        },
      },
      {
        title: '표준시간',
        dataIndex: 'std_time',
        width: 90,
        align: 'right',
        render: (val: unknown) => (val != null ? Number(val) : '-'),
      },
      {
        title: '작업장',
        dataIndex: 'workshop_cd',
        width: 110,
        ellipsis: true,
        render: (val: unknown) => (val as string) || '-',
      },
      {
        title: '사용여부',
        dataIndex: 'use_yn',
        width: 80,
        align: 'center',
        render: (val: unknown) => (
          <Tag color={(val as string) === 'Y' ? 'green' : 'default'}>
            {(val as string) === 'Y' ? '사용' : '미사용'}
          </Tag>
        ),
      },
      {
        title: '등록일',
        dataIndex: 'create_dt',
        width: 110,
        sorter: true,
        render: (val: unknown) => (val ? dayjs(val as string).format('YYYY-MM-DD') : '-'),
      },
      {
        title: '관리',
        dataIndex: '_action',
        width: 180,
        align: 'center',
        render: (_: unknown, record: ProcessRow) => (
          <div className="flex items-center gap-1">
            <PermissionButton
              action="update"
              menuUrl={MENU_URL}
              fallback="hide"
              size="small"
              variant="ghost"
              icon={<Pencil className="w-4 h-4" />}
              onClick={() => handleEdit(record)}
            >
              {''}
            </PermissionButton>
            <PermissionButton
              action="delete"
              menuUrl={MENU_URL}
              fallback="hide"
              size="small"
              variant="ghost"
              className="text-red-500"
              icon={<Trash2 className="w-4 h-4" />}
              onClick={() =>
                confirm({
                  title: '공정을 삭제하시겠습니까?',
                  content: '연결된 데이터가 있으면 삭제가 거부됩니다.',
                  onOk: () => handleDelete(record),
                  okText: '삭제',
                  danger: true,
                })
              }
            >
              {''}
            </PermissionButton>
            <Button
              size="small"
              variant="ghost"
              icon={<Wrench className="w-4 h-4" />}
              onClick={() => handleOpenEquip(record)}
              title="설비 매핑"
            />
            <Button
              size="small"
              variant="ghost"
              icon={<History className="w-4 h-4" />}
              onClick={() => handleHistory(record)}
            />
          </div>
        ),
      },
    ],
    [handleEdit, handleDelete, handleHistory, handleOpenEquip],
  );

  /* ── Pagination config ─── */
  const paginationConfig: PaginationConfig = useMemo(
    () => ({
      current: pagination.page,
      pageSize: pagination.pageSize,
      total: pagination.total,
      onChange: handlePageChange,
      pageSizeOptions: [10, 20, 50, 100],
    }),
    [pagination, handlePageChange],
  );

  /* ── Render ─── */
  return (
    <div>
      {/* Search */}
      <SearchForm
        fields={SEARCH_FIELDS}
        onSearch={handleSearch}
        onReset={handleSearchReset}
        loading={loading}
        extraButtons={
          <div className="flex items-center gap-2">
            <ExcelUploadButton
              uploadUrl="/v1/processes/import"
              onComplete={() => fetchProcesses(pagination.page, pagination.pageSize, sortField, sortOrder, filters)}
            />
            <ExcelDownloadButton filename="공정목록" columns={EXCEL_COLUMNS} data={fetchExcelData} />
          </div>
        }
      />

      {/* Toolbar */}
      <div className="flex justify-between items-center mb-3">
        <div className="flex items-center gap-4">
          <span className="text-gray-500 text-sm">
            총 <strong>{pagination.total.toLocaleString()}</strong>건
          </span>
          <Button size="small" icon={<GitBranch className="w-4 h-4" />} onClick={handleOpenRouting}>
            라우팅 관리
          </Button>
        </div>
        <PermissionButton
          action="create"
          menuUrl={MENU_URL}
          variant="primary"
          icon={<Plus className="w-4 h-4" />}
          onClick={handleCreate}
        >
          공정 등록
        </PermissionButton>
      </div>

      {/* Table */}
      <Table<ProcessRow>
        columns={columns}
        dataSource={processes}
        rowKey="process_cd"
        loading={loading}
        pagination={paginationConfig}
        sortBy={sortField}
        sortOrder={sortOrder}
        onSortChange={handleSortChange}
        scrollX={1100}
      />

      {/* Create/Edit Modal */}
      <FormModal<ProcessFormValues>
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditProcess(null);
        }}
        onSubmit={handleSubmit}
        mode={modalMode}
        initialValues={modalInitialValues}
        title={modalMode === 'create' ? '공정 등록' : '공정 수정'}
        width={520}
      >
        {(form, mode) => (
          <Section title="공정 정보">
            <Row label="공정코드" required>
              <Input
                name="process_cd"
                placeholder="공정코드 입력"
                disabled={mode === 'edit'}
                maxLength={20}
                required
                defaultValue={form.getFieldsValue().process_cd ?? ''}
                onChange={(e) => form.setFieldsValue({ process_cd: e.target.value } as Partial<ProcessFormValues>)}
              />
            </Row>
            <Row label="공정명" required>
              <Input
                name="process_nm"
                placeholder="공정명 입력"
                maxLength={100}
                required
                defaultValue={form.getFieldsValue().process_nm ?? ''}
                onChange={(e) => form.setFieldsValue({ process_nm: e.target.value } as Partial<ProcessFormValues>)}
              />
            </Row>
            <Row label="공정유형">
              <Select
                name="process_type"
                placeholder="공정유형 선택"
                options={[{ label: '선택 안함', value: '' }, ...PROCESS_TYPE_OPTIONS]}
                defaultValue={form.getFieldsValue().process_type ?? ''}
                onChange={(e) => form.setFieldsValue({ process_type: e.target.value || null } as Partial<ProcessFormValues>)}
              />
            </Row>
            <Row label="표준시간(분)">
              <input
                type="number"
                name="std_time"
                placeholder="표준시간"
                min={0}
                step={0.01}
                className="w-full h-9 bg-dark-700 border border-dark-500 rounded-lg px-3 text-sm text-gray-700 focus:outline-none focus:bg-white focus:border-cyan-accent focus:ring-2 focus:ring-cyan-accent/15"
                defaultValue={form.getFieldsValue().std_time ?? ''}
                onChange={(e) => form.setFieldsValue({ std_time: e.target.value ? Number(e.target.value) : null } as Partial<ProcessFormValues>)}
              />
            </Row>
            <Row label="작업장코드">
              <Input
                name="workshop_cd"
                placeholder="작업장코드 입력"
                maxLength={20}
                defaultValue={form.getFieldsValue().workshop_cd ?? ''}
                onChange={(e) => form.setFieldsValue({ workshop_cd: e.target.value || null } as Partial<ProcessFormValues>)}
              />
            </Row>
            {mode === 'edit' && (
              <Row label="사용여부">
                <Select
                  name="use_yn"
                  options={USE_YN_OPTIONS}
                  defaultValue={form.getFieldsValue().use_yn ?? 'Y'}
                  onChange={(e) => form.setFieldsValue({ use_yn: e.target.value } as Partial<ProcessFormValues>)}
                />
              </Row>
            )}
          </Section>
        )}
      </FormModal>

      {/* History Drawer */}
      <DataHistoryDrawer
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        tableName="tb_process"
        recordId={historyProcessCd}
        title={`공정 변경이력 (${historyProcessCd})`}
      />

      {/* Routing Drawer */}
      <Drawer
        title="라우팅 관리 (품목별 공정순서)"
        open={routingOpen}
        onClose={() => setRoutingOpen(false)}
        width={720}
      >
        <div className="flex items-center gap-2 mb-4">
          <Input
            placeholder="품목코드 입력"
            value={routingItemCdInput}
            onChange={(e) => setRoutingItemCdInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleRoutingSearch()}
            className="!w-[200px]"
          />
          <Button variant="primary" onClick={handleRoutingSearch}>
            조회
          </Button>
        </div>

        {routingItemCd && (
          <>
            <h5 className="text-sm font-semibold mb-3">품목: {routingItemCd}</h5>

            {/* Add routing entry */}
            <div className="flex gap-2 mb-3 flex-wrap">
              <Input
                placeholder="공정코드"
                value={newRoutingProcessCd}
                onChange={(e) => setNewRoutingProcessCd(e.target.value)}
                className="!w-[120px]"
              />
              <input
                type="number"
                placeholder="순서"
                value={newRoutingSeqNo}
                onChange={(e) => setNewRoutingSeqNo(Number(e.target.value) || 10)}
                min={1}
                className="w-[80px] h-9 bg-dark-700 border border-dark-500 rounded-lg px-3 text-sm text-gray-700 focus:outline-none focus:bg-white focus:border-cyan-accent focus:ring-2 focus:ring-cyan-accent/15"
              />
              <input
                type="number"
                placeholder="표준시간"
                value={newRoutingStdTime ?? ''}
                onChange={(e) => setNewRoutingStdTime(e.target.value ? Number(e.target.value) : null)}
                min={0}
                step={0.01}
                className="w-[100px] h-9 bg-dark-700 border border-dark-500 rounded-lg px-3 text-sm text-gray-700 focus:outline-none focus:bg-white focus:border-cyan-accent focus:ring-2 focus:ring-cyan-accent/15"
              />
              <input
                type="number"
                placeholder="준비시간"
                value={newRoutingSetupTime ?? ''}
                onChange={(e) => setNewRoutingSetupTime(e.target.value ? Number(e.target.value) : null)}
                min={0}
                step={0.01}
                className="w-[100px] h-9 bg-dark-700 border border-dark-500 rounded-lg px-3 text-sm text-gray-700 focus:outline-none focus:bg-white focus:border-cyan-accent focus:ring-2 focus:ring-cyan-accent/15"
              />
              <Button variant="primary" icon={<Plus className="w-4 h-4" />} onClick={handleAddRouting}>
                추가
              </Button>
            </div>

            <Table<RoutingRow>
              columns={routingColumns}
              dataSource={routings}
              rowKey="routing_id"
              loading={routingLoading}
            />
          </>
        )}
      </Drawer>

      {/* Equipment Mapping Drawer */}
      <Drawer
        title={`설비 매핑 (${equipProcessCd})`}
        open={equipOpen}
        onClose={() => setEquipOpen(false)}
        width={560}
      >
        <div className="flex gap-2 mb-4">
          <Input
            placeholder="설비코드"
            value={newEquipCd}
            onChange={(e) => setNewEquipCd(e.target.value)}
            className="!w-[160px]"
          />
          <input
            type="number"
            placeholder="우선순위"
            value={newEquipPriority}
            onChange={(e) => setNewEquipPriority(Number(e.target.value) || 1)}
            min={1}
            className="w-[100px] h-9 bg-dark-700 border border-dark-500 rounded-lg px-3 text-sm text-gray-700 focus:outline-none focus:bg-white focus:border-cyan-accent focus:ring-2 focus:ring-cyan-accent/15"
          />
          <Button variant="primary" icon={<Plus className="w-4 h-4" />} onClick={handleAddEquipMapping}>
            추가
          </Button>
        </div>

        <Table<EquipMappingRow>
          columns={equipColumns}
          dataSource={equipMappings}
          rowKey={(r) => `${r.equip_cd}-${r.process_cd}`}
          loading={equipLoading}
        />
      </Drawer>
    </div>
  );
}
