'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Button,
  Space,
  Tag,
  Form,
  Input,
  InputNumber,
  Select,
  Table,
  Drawer,
  message,
  Popconfirm,
  Typography,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  HistoryOutlined,
  PartitionOutlined,
  ToolOutlined,
} from '@ant-design/icons';
import type { TablePaginationConfig } from 'antd/es/table';
import type { SorterResult } from 'antd/es/table/interface';
import PermissionButton from '@/components/auth/PermissionButton';
import FormModal, { type FormModalMode } from '@/components/common/FormModal';
import SearchForm, { type SearchFieldDef } from '@/components/common/SearchForm';
import ExcelUploadButton from '@/components/common/ExcelUploadButton';
import ExcelDownloadButton, { type ExcelColumn } from '@/components/common/ExcelDownloadButton';
import DataHistoryDrawer from '@/components/common/DataHistoryDrawer';
import apiClient from '@/lib/apiClient';
import type { PaginatedResponse } from '@/types';
import dayjs from 'dayjs';

const { Title } = Typography;

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
}

interface EquipMappingRow {
  equip_cd: string;
  process_cd: string;
  priority: number;
  equipment: { equip_nm: string; equip_type: string | null };
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
        message.error(err?.response?.data?.message ?? '공정 목록 조회에 실패했습니다.');
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

  /* ── Table change ─── */
  const handleTableChange = useCallback(
    (
      paginationConfig: TablePaginationConfig,
      _filters: Record<string, unknown>,
      sorter: SorterResult<ProcessRow> | SorterResult<ProcessRow>[],
    ) => {
      const newPage = paginationConfig.current ?? 1;
      const newPageSize = paginationConfig.pageSize ?? 20;
      let newSortField: string | undefined;
      let newSortOrder: 'asc' | 'desc' | undefined;
      if (!Array.isArray(sorter) && sorter.field && sorter.order) {
        newSortField = sorter.field as string;
        newSortOrder = sorter.order === 'ascend' ? 'asc' : 'desc';
      }
      setSortField(newSortField);
      setSortOrder(newSortOrder);
      setPagination((prev) => ({ ...prev, page: newPage, pageSize: newPageSize }));
      fetchProcesses(newPage, newPageSize, newSortField, newSortOrder, filters);
    },
    [fetchProcesses, filters],
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
        message.success('공정이 삭제되었습니다.');
        fetchProcesses(pagination.page, pagination.pageSize, sortField, sortOrder, filters);
      } catch (err: any) {
        message.error(err?.response?.data?.message ?? '삭제에 실패했습니다.');
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
      message.error(err?.response?.data?.message ?? '라우팅 조회에 실패했습니다.');
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
        message.success('라우팅이 삭제되었습니다.');
        if (routingItemCd) fetchRoutings(routingItemCd);
      } catch (err: any) {
        message.error(err?.response?.data?.message ?? '삭제에 실패했습니다.');
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
      message.warning('품목코드와 공정코드를 입력하세요.');
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
      message.success('라우팅이 추가되었습니다.');
      setNewRoutingProcessCd('');
      setNewRoutingSeqNo((routings.length + 1) * 10);
      setNewRoutingStdTime(null);
      setNewRoutingSetupTime(null);
      fetchRoutings(routingItemCd);
    } catch (err: any) {
      message.error(err?.response?.data?.message ?? '추가에 실패했습니다.');
    }
  }, [routingItemCd, newRoutingProcessCd, newRoutingSeqNo, newRoutingStdTime, newRoutingSetupTime, routings.length, fetchRoutings]);

  const routingColumns = useMemo(
    () => [
      { title: '순서', dataIndex: 'seq_no', width: 60, align: 'center' as const },
      { title: '공정코드', dataIndex: 'process_cd', width: 120 },
      {
        title: '공정명',
        dataIndex: ['process', 'process_nm'],
        width: 150,
      },
      {
        title: '표준시간',
        dataIndex: 'std_time',
        width: 90,
        align: 'right' as const,
        render: (val: unknown) => (val != null ? Number(val) : '-'),
      },
      {
        title: '준비시간',
        dataIndex: 'setup_time',
        width: 90,
        align: 'right' as const,
        render: (val: unknown) => (val != null ? Number(val) : '-'),
      },
      {
        title: '사용',
        dataIndex: 'use_yn',
        width: 60,
        align: 'center' as const,
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
        align: 'center' as const,
        render: (_: unknown, record: RoutingRow) => (
          <Popconfirm title="삭제하시겠습니까?" onConfirm={() => handleDeleteRouting(record.routing_id)} okText="삭제" cancelText="취소">
            <Button size="small" type="text" danger icon={<DeleteOutlined />} />
          </Popconfirm>
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
      message.error(err?.response?.data?.message ?? '설비 매핑 조회에 실패했습니다.');
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
      message.warning('설비코드를 입력하세요.');
      return;
    }
    try {
      await apiClient.post(`/v1/processes/${equipProcessCd}/equipments`, {
        equip_cd: newEquipCd,
        priority: newEquipPriority,
      });
      message.success('설비 매핑이 추가되었습니다.');
      setNewEquipCd('');
      setNewEquipPriority(1);
      fetchEquipMappings(equipProcessCd);
    } catch (err: any) {
      message.error(err?.response?.data?.message ?? '추가에 실패했습니다.');
    }
  }, [equipProcessCd, newEquipCd, newEquipPriority, fetchEquipMappings]);

  const handleRemoveEquipMapping = useCallback(
    async (equipCd: string) => {
      try {
        await apiClient.delete(`/v1/processes/${equipProcessCd}/equipments/${equipCd}`);
        message.success('설비 매핑이 삭제되었습니다.');
        fetchEquipMappings(equipProcessCd);
      } catch (err: any) {
        message.error(err?.response?.data?.message ?? '삭제에 실패했습니다.');
      }
    },
    [equipProcessCd, fetchEquipMappings],
  );

  const equipColumns = useMemo(
    () => [
      { title: '설비코드', dataIndex: 'equip_cd', width: 120 },
      {
        title: '설비명',
        dataIndex: ['equipment', 'equip_nm'],
        width: 150,
      },
      {
        title: '설비유형',
        dataIndex: ['equipment', 'equip_type'],
        width: 100,
      },
      {
        title: '우선순위',
        dataIndex: 'priority',
        width: 80,
        align: 'center' as const,
      },
      {
        title: '',
        dataIndex: '_action',
        width: 50,
        align: 'center' as const,
        render: (_: unknown, record: EquipMappingRow) => (
          <Popconfirm title="매핑을 삭제하시겠습니까?" onConfirm={() => handleRemoveEquipMapping(record.equip_cd)} okText="삭제" cancelText="취소">
            <Button size="small" type="text" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        ),
      },
    ],
    [handleRemoveEquipMapping],
  );

  /* ── Table columns ─── */
  const columns = useMemo(
    () => [
      { title: '공정코드', dataIndex: 'process_cd', width: 120, sorter: true, ellipsis: true },
      { title: '공정명', dataIndex: 'process_nm', width: 180, sorter: true, ellipsis: true },
      {
        title: '공정유형',
        dataIndex: 'process_type',
        width: 100,
        align: 'center' as const,
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
        align: 'right' as const,
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
        align: 'center' as const,
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
        align: 'center' as const,
        fixed: 'right' as const,
        render: (_: unknown, record: ProcessRow) => (
          <Space size={4}>
            <PermissionButton
              action="update"
              menuUrl={MENU_URL}
              fallback="hide"
              size="small"
              type="text"
              icon={<EditOutlined />}
              onClick={() => handleEdit(record)}
            >
              {''}
            </PermissionButton>
            <Popconfirm
              title="공정을 삭제하시겠습니까?"
              description="연결된 데이터가 있으면 삭제가 거부됩니다."
              onConfirm={() => handleDelete(record)}
              okText="삭제"
              cancelText="취소"
            >
              <PermissionButton
                action="delete"
                menuUrl={MENU_URL}
                fallback="hide"
                size="small"
                type="text"
                danger
                icon={<DeleteOutlined />}
              >
                {''}
              </PermissionButton>
            </Popconfirm>
            <Button
              size="small"
              type="text"
              icon={<ToolOutlined />}
              onClick={() => handleOpenEquip(record)}
              title="설비 매핑"
            />
            <Button
              size="small"
              type="text"
              icon={<HistoryOutlined />}
              onClick={() => handleHistory(record)}
            />
          </Space>
        ),
      },
    ],
    [handleEdit, handleDelete, handleHistory, handleOpenEquip],
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
          <Space>
            <ExcelUploadButton
              uploadUrl="/v1/processes/import"
              onComplete={() => fetchProcesses(pagination.page, pagination.pageSize, sortField, sortOrder, filters)}
            />
            <ExcelDownloadButton filename="공정목록" columns={EXCEL_COLUMNS} data={fetchExcelData} />
          </Space>
        }
      />

      {/* Toolbar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <Space>
          <span style={{ color: '#666', fontSize: 13 }}>
            총 <strong>{pagination.total.toLocaleString()}</strong>건
          </span>
          <Button size="small" icon={<PartitionOutlined />} onClick={handleOpenRouting}>
            라우팅 관리
          </Button>
        </Space>
        <PermissionButton
          action="create"
          menuUrl={MENU_URL}
          type="primary"
          icon={<PlusOutlined />}
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
        size="small"
        scroll={{ x: 1100 }}
        pagination={{
          current: pagination.page,
          pageSize: pagination.pageSize,
          total: pagination.total,
          showSizeChanger: true,
          showQuickJumper: true,
          pageSizeOptions: ['10', '20', '50', '100'],
          showTotal: (total, range) => `${range[0]}-${range[1]} / ${total}건`,
        }}
        onChange={handleTableChange as any}
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
          <>
            <Form.Item
              name="process_cd"
              label="공정코드"
              rules={[
                { required: true, message: '공정코드를 입력하세요.' },
                { max: 20, message: '최대 20자까지 입력 가능합니다.' },
              ]}
            >
              <Input placeholder="공정코드 입력" disabled={mode === 'edit'} maxLength={20} />
            </Form.Item>
            <Form.Item
              name="process_nm"
              label="공정명"
              rules={[
                { required: true, message: '공정명을 입력하세요.' },
                { max: 100, message: '최대 100자까지 입력 가능합니다.' },
              ]}
            >
              <Input placeholder="공정명 입력" maxLength={100} />
            </Form.Item>
            <Form.Item name="process_type" label="공정유형">
              <Select placeholder="공정유형 선택" options={PROCESS_TYPE_OPTIONS} allowClear />
            </Form.Item>
            <Form.Item name="std_time" label="표준시간(분)">
              <InputNumber placeholder="표준시간" min={0} style={{ width: '100%' }} precision={2} />
            </Form.Item>
            <Form.Item name="workshop_cd" label="작업장코드">
              <Input placeholder="작업장코드 입력" maxLength={20} />
            </Form.Item>
            {mode === 'edit' && (
              <Form.Item name="use_yn" label="사용여부">
                <Select options={USE_YN_OPTIONS} />
              </Form.Item>
            )}
          </>
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
        styles={{ wrapper: { width: 720 } }}
      >
        <Space style={{ marginBottom: 16 }}>
          <Input
            placeholder="품목코드 입력"
            value={routingItemCdInput}
            onChange={(e) => setRoutingItemCdInput(e.target.value)}
            onPressEnter={handleRoutingSearch}
            style={{ width: 200 }}
          />
          <Button type="primary" onClick={handleRoutingSearch}>
            조회
          </Button>
        </Space>

        {routingItemCd && (
          <>
            <Title level={5} style={{ marginBottom: 12 }}>
              품목: {routingItemCd}
            </Title>

            {/* Add routing entry */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
              <Input
                placeholder="공정코드"
                value={newRoutingProcessCd}
                onChange={(e) => setNewRoutingProcessCd(e.target.value)}
                style={{ width: 120 }}
              />
              <InputNumber
                placeholder="순서"
                value={newRoutingSeqNo}
                onChange={(v) => setNewRoutingSeqNo(v ?? 10)}
                min={1}
                style={{ width: 80 }}
              />
              <InputNumber
                placeholder="표준시간"
                value={newRoutingStdTime}
                onChange={(v) => setNewRoutingStdTime(v)}
                min={0}
                precision={2}
                style={{ width: 100 }}
              />
              <InputNumber
                placeholder="준비시간"
                value={newRoutingSetupTime}
                onChange={(v) => setNewRoutingSetupTime(v)}
                min={0}
                precision={2}
                style={{ width: 100 }}
              />
              <Button type="primary" icon={<PlusOutlined />} onClick={handleAddRouting}>
                추가
              </Button>
            </div>

            <Table<RoutingRow>
              columns={routingColumns}
              dataSource={routings}
              rowKey="routing_id"
              loading={routingLoading}
              size="small"
              pagination={false}
            />
          </>
        )}
      </Drawer>

      {/* Equipment Mapping Drawer */}
      <Drawer
        title={`설비 매핑 (${equipProcessCd})`}
        open={equipOpen}
        onClose={() => setEquipOpen(false)}
        styles={{ wrapper: { width: 560 } }}
      >
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <Input
            placeholder="설비코드"
            value={newEquipCd}
            onChange={(e) => setNewEquipCd(e.target.value)}
            style={{ width: 160 }}
          />
          <InputNumber
            placeholder="우선순위"
            value={newEquipPriority}
            onChange={(v) => setNewEquipPriority(v ?? 1)}
            min={1}
            style={{ width: 100 }}
          />
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAddEquipMapping}>
            추가
          </Button>
        </div>

        <Table<EquipMappingRow>
          columns={equipColumns}
          dataSource={equipMappings}
          rowKey={(r) => `${r.equip_cd}-${r.process_cd}`}
          loading={equipLoading}
          size="small"
          pagination={false}
        />
      </Drawer>
    </div>
  );
}
