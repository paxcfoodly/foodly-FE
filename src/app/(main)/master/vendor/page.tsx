'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, Pencil, Trash2, History } from 'lucide-react';
import { Button, Tag } from '@/components/ui';
import toast from '@/components/ui/toast';
import { confirm } from '@/components/ui/confirm';
import PermissionButton from '@/components/auth/PermissionButton';
import FormModal, { type FormModalMode, type FormHandle } from '@/components/common/FormModal';
import SearchForm, { type SearchFieldDef } from '@/components/common/SearchForm';
import DataGrid from '@/components/common/DataGrid';
import ExcelUploadButton from '@/components/common/ExcelUploadButton';
import ExcelDownloadButton, { type ExcelColumn } from '@/components/common/ExcelDownloadButton';
import DataHistoryDrawer from '@/components/common/DataHistoryDrawer';
import Input, { Textarea } from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import { Section, Row } from '@/components/ui/Section';
import apiClient from '@/lib/apiClient';
import type { PaginatedResponse } from '@/types';
import dayjs from 'dayjs';

/* ── Types ─────────────────────────────────────────── */

interface CustomerRow {
  cust_cd: string;
  cust_nm: string;
  cust_type: string | null;
  biz_no: string | null;
  contact_nm: string | null;
  tel: string | null;
  email: string | null;
  address: string | null;
  use_yn: string;
  create_by: string | null;
  create_dt: string;
  update_by: string | null;
  update_dt: string | null;
  [key: string]: unknown;
}

interface CustomerFormValues {
  cust_cd: string;
  cust_nm: string;
  cust_type?: string;
  biz_no?: string;
  contact_nm?: string;
  tel?: string;
  email?: string;
  address?: string;
  use_yn?: string;
  [key: string]: unknown;
}

const MENU_URL = '/master/vendor';

const CUST_TYPE_OPTIONS = [
  { label: '고객', value: 'CUSTOMER' },
  { label: '공급업체', value: 'SUPPLIER' },
  { label: '고객/공급', value: 'BOTH' },
];

const CUST_TYPE_LABEL: Record<string, string> = {
  CUSTOMER: '고객',
  SUPPLIER: '공급업체',
  BOTH: '고객/공급',
};

const CUST_TYPE_COLOR: Record<string, string> = {
  CUSTOMER: 'blue',
  SUPPLIER: 'orange',
  BOTH: 'green',
};

const USE_YN_OPTIONS = [
  { label: '사용', value: 'Y' },
  { label: '미사용', value: 'N' },
];

/* ── Excel columns ─── */
const EXCEL_COLUMNS: ExcelColumn[] = [
  { header: '거래처코드', key: 'cust_cd', width: 15 },
  { header: '거래처명', key: 'cust_nm', width: 25 },
  { header: '거래처유형', key: 'cust_type', width: 12 },
  { header: '사업자번호', key: 'biz_no', width: 15 },
  { header: '담당자', key: 'contact_nm', width: 15 },
  { header: '전화번호', key: 'tel', width: 15 },
  { header: '이메일', key: 'email', width: 25 },
  { header: '주소', key: 'address', width: 40 },
  { header: '사용여부', key: 'use_yn', width: 10 },
];

/* ── Search fields ─── */
const SEARCH_FIELDS: SearchFieldDef[] = [
  { name: 'cust_cd', label: '거래처코드', type: 'text', placeholder: '거래처코드 입력' },
  { name: 'cust_nm', label: '거래처명', type: 'text', placeholder: '거래처명 입력' },
  {
    name: 'cust_type',
    label: '거래처유형',
    type: 'select',
    options: [{ label: '전체', value: '' }, ...CUST_TYPE_OPTIONS],
  },
  {
    name: 'use_yn',
    label: '사용여부',
    type: 'select',
    options: [{ label: '전체', value: '' }, ...USE_YN_OPTIONS],
  },
];

/* ── Component ─────────────────────────────────────── */

export default function CustomerMasterPage() {
  /* ── State ─── */
  const [items, setItems] = useState<CustomerRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 20, total: 0 });
  const [sortField, setSortField] = useState<string | undefined>();
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc' | undefined>();
  const [filters, setFilters] = useState<Record<string, unknown>>({});

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<FormModalMode>('create');
  const [editItem, setEditItem] = useState<CustomerRow | null>(null);

  // History drawer
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyCd, setHistoryCd] = useState('');

  /* ── Data Fetching ─── */
  const fetchItems = useCallback(
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

        const res = await apiClient.get<PaginatedResponse<CustomerRow>>('/v1/customers', { params });
        const body = res.data;
        setItems(body.data ?? []);
        if (body.pagination) {
          setPagination({ page: body.pagination.page, pageSize: body.pagination.pageSize, total: body.pagination.total });
        }
      } catch (err: any) {
        toast.error(err?.response?.data?.message ?? '거래처 목록 조회에 실패했습니다.');
      } finally {
        setLoading(false);
      }
    },
    [filters, pagination.page, pagination.pageSize],
  );

  useEffect(() => {
    fetchItems(1, pagination.pageSize, sortField, sortOrder, filters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── Handlers ─── */
  const handleSearch = useCallback(
    (values: Record<string, unknown>) => {
      setFilters(values);
      setPagination((prev) => ({ ...prev, page: 1 }));
      fetchItems(1, pagination.pageSize, sortField, sortOrder, values);
    },
    [fetchItems, pagination.pageSize, sortField, sortOrder],
  );

  const handleSearchReset = useCallback(() => {
    setFilters({});
    setPagination((prev) => ({ ...prev, page: 1 }));
    fetchItems(1, pagination.pageSize, sortField, sortOrder, {});
  }, [fetchItems, pagination.pageSize, sortField, sortOrder]);

  const handlePageChange = useCallback(
    (newPage: number, newPageSize: number) => {
      setPagination((prev) => ({ ...prev, page: newPage, pageSize: newPageSize }));
      fetchItems(newPage, newPageSize, sortField, sortOrder, filters);
    },
    [fetchItems, sortField, sortOrder, filters],
  );

  const handleSortChange = useCallback(
    (field: string, order: 'asc' | 'desc') => {
      setSortField(field || undefined);
      setSortOrder(field ? order : undefined);
      fetchItems(pagination.page, pagination.pageSize, field || undefined, field ? order : undefined, filters);
    },
    [fetchItems, pagination.page, pagination.pageSize, filters],
  );

  const handleCreate = useCallback(() => {
    setEditItem(null);
    setModalMode('create');
    setModalOpen(true);
  }, []);

  const handleEdit = useCallback((record: CustomerRow) => {
    setEditItem(record);
    setModalMode('edit');
    setModalOpen(true);
  }, []);

  const handleSubmit = useCallback(
    async (values: CustomerFormValues, mode: FormModalMode) => {
      if (mode === 'create') {
        await apiClient.post('/v1/customers', {
          cust_cd: values.cust_cd,
          cust_nm: values.cust_nm,
          cust_type: values.cust_type || null,
          biz_no: values.biz_no || null,
          contact_nm: values.contact_nm || null,
          tel: values.tel || null,
          email: values.email || null,
          address: values.address || null,
        });
      } else {
        await apiClient.put(`/v1/customers/${editItem!.cust_cd}`, {
          cust_nm: values.cust_nm,
          cust_type: values.cust_type || null,
          biz_no: values.biz_no || null,
          contact_nm: values.contact_nm || null,
          tel: values.tel || null,
          email: values.email || null,
          address: values.address || null,
          use_yn: values.use_yn,
        });
      }
      fetchItems(pagination.page, pagination.pageSize, sortField, sortOrder, filters);
    },
    [editItem, fetchItems, pagination.page, pagination.pageSize, sortField, sortOrder, filters],
  );

  const handleDelete = useCallback(
    (record: CustomerRow) => {
      confirm({
        title: '거래처를 삭제하시겠습니까?',
        content: '다른 데이터에서 참조 중인 경우 삭제가 거부됩니다.',
        okText: '삭제',
        cancelText: '취소',
        danger: true,
        onOk: async () => {
          try {
            await apiClient.delete(`/v1/customers/${record.cust_cd}`);
            toast.success('거래처가 삭제되었습니다.');
            fetchItems(pagination.page, pagination.pageSize, sortField, sortOrder, filters);
          } catch (err: any) {
            toast.error(err?.response?.data?.message ?? '삭제에 실패했습니다.');
          }
        },
      });
    },
    [fetchItems, pagination.page, pagination.pageSize, sortField, sortOrder, filters],
  );

  const handleHistory = useCallback((record: CustomerRow) => {
    setHistoryCd(record.cust_cd);
    setHistoryOpen(true);
  }, []);

  const fetchExcelData = useCallback(async () => {
    const res = await apiClient.get<PaginatedResponse<CustomerRow>>('/v1/customers', { params: { limit: 99999 } });
    return (res.data?.data ?? []) as Record<string, unknown>[];
  }, []);

  /* ── Modal initial values ─── */
  const modalInitialValues = useMemo(() => {
    if (!editItem) return undefined;
    return {
      cust_cd: editItem.cust_cd,
      cust_nm: editItem.cust_nm,
      cust_type: editItem.cust_type ?? undefined,
      biz_no: editItem.biz_no ?? undefined,
      contact_nm: editItem.contact_nm ?? undefined,
      tel: editItem.tel ?? undefined,
      email: editItem.email ?? undefined,
      address: editItem.address ?? undefined,
      use_yn: editItem.use_yn,
    } as Partial<CustomerFormValues>;
  }, [editItem]);

  /* ── Table columns ─── */
  const columns = useMemo(
    () => [
      { title: '거래처코드', dataIndex: 'cust_cd', width: 130, sorter: true, ellipsis: true },
      { title: '거래처명', dataIndex: 'cust_nm', width: 180, sorter: true, ellipsis: true },
      {
        title: '거래처유형',
        dataIndex: 'cust_type',
        width: 100,
        align: 'center' as const,
        sorter: true,
        render: (val: unknown) => {
          const v = val as string;
          if (!v) return '-';
          return <Tag color={CUST_TYPE_COLOR[v] ?? 'gray'}>{CUST_TYPE_LABEL[v] ?? v}</Tag>;
        },
      },
      { title: '사업자번호', dataIndex: 'biz_no', width: 130, ellipsis: true, render: (val: unknown) => (val as string) || '-' },
      { title: '담당자', dataIndex: 'contact_nm', width: 100, ellipsis: true, render: (val: unknown) => (val as string) || '-' },
      { title: '전화번호', dataIndex: 'tel', width: 130, ellipsis: true, render: (val: unknown) => (val as string) || '-' },
      { title: '이메일', dataIndex: 'email', width: 180, ellipsis: true, render: (val: unknown) => (val as string) || '-' },
      {
        title: '사용여부',
        dataIndex: 'use_yn',
        width: 80,
        align: 'center' as const,
        render: (val: unknown) => (
          <Tag color={(val as string) === 'Y' ? 'green' : 'gray'}>
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
        width: 130,
        align: 'center' as const,
        render: (_: unknown, record: CustomerRow) => (
          <div className="flex items-center justify-center gap-1">
            <PermissionButton action="update" menuUrl={MENU_URL} fallback="hide" size="small" variant="ghost" icon={<Pencil className="w-4 h-4" />} onClick={() => handleEdit(record)}>{''}</PermissionButton>
            <PermissionButton action="delete" menuUrl={MENU_URL} fallback="hide" size="small" variant="danger" icon={<Trash2 className="w-4 h-4" />} onClick={() => handleDelete(record)}>{''}</PermissionButton>
            <Button size="small" variant="ghost" icon={<History className="w-4 h-4" />} onClick={() => handleHistory(record)} />
          </div>
        ),
      },
    ],
    [handleEdit, handleDelete, handleHistory],
  );

  /* ── Render ─── */
  return (
    <div>
      <SearchForm
        fields={SEARCH_FIELDS}
        onSearch={handleSearch}
        onReset={handleSearchReset}
        loading={loading}
        extraButtons={
          <div className="flex items-center gap-2">
            <ExcelUploadButton uploadUrl="/v1/customers/import" onComplete={() => fetchItems(pagination.page, pagination.pageSize, sortField, sortOrder, filters)} />
            <ExcelDownloadButton filename="거래처목록" columns={EXCEL_COLUMNS} data={fetchExcelData} />
          </div>
        }
      />

      <div className="flex justify-between items-center mb-3">
        <span className="text-gray-500 text-sm">총 <strong>{pagination.total.toLocaleString()}</strong>건</span>
        <PermissionButton action="create" menuUrl={MENU_URL} variant="primary" icon={<Plus className="w-4 h-4" />} onClick={handleCreate}>거래처 등록</PermissionButton>
      </div>

      <DataGrid<CustomerRow>
        columns={columns}
        dataSource={items}
        rowKey="cust_cd"
        loading={loading}
        page={pagination.page}
        pageSize={pagination.pageSize}
        total={pagination.total}
        onPageChange={handlePageChange}
        sortBy={sortField}
        sortOrder={sortOrder}
        onSortChange={handleSortChange}
        scrollX={1400}
        size="small"
      />

      <FormModal<CustomerFormValues>
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditItem(null); }}
        onSubmit={handleSubmit}
        mode={modalMode}
        initialValues={modalInitialValues}
        title={modalMode === 'create' ? '거래처 등록' : '거래처 수정'}
        width={600}
      >
        {(form, mode) => (
          <div className="space-y-5">
            <Section title="기본 정보">
              <Row label="거래처코드" required>
                <Input name="cust_cd" placeholder="거래처코드 입력" disabled={mode === 'edit'} maxLength={30} required value={(form.getFieldsValue().cust_cd as string) ?? ''} onChange={(e) => form.setFieldsValue({ cust_cd: e.target.value } as Partial<CustomerFormValues>)} />
              </Row>
              <Row label="거래처명" required>
                <Input name="cust_nm" placeholder="거래처명 입력" maxLength={200} required value={(form.getFieldsValue().cust_nm as string) ?? ''} onChange={(e) => form.setFieldsValue({ cust_nm: e.target.value } as Partial<CustomerFormValues>)} />
              </Row>
              <Row label="거래처유형">
                <Select placeholder="거래처유형 선택" options={CUST_TYPE_OPTIONS} value={(form.getFieldsValue().cust_type as string) ?? ''} onChange={(e) => form.setFieldsValue({ cust_type: e.target.value } as Partial<CustomerFormValues>)} />
              </Row>
              <Row label="사업자번호">
                <Input name="biz_no" placeholder="사업자번호 입력" maxLength={20} value={(form.getFieldsValue().biz_no as string) ?? ''} onChange={(e) => form.setFieldsValue({ biz_no: e.target.value } as Partial<CustomerFormValues>)} />
              </Row>
              {mode === 'edit' && (
                <Row label="사용여부">
                  <Select options={USE_YN_OPTIONS} value={(form.getFieldsValue().use_yn as string) ?? ''} onChange={(e) => form.setFieldsValue({ use_yn: e.target.value } as Partial<CustomerFormValues>)} />
                </Row>
              )}
            </Section>
            <Section title="연락처">
              <Row label="담당자">
                <Input name="contact_nm" placeholder="담당자명 입력" maxLength={100} value={(form.getFieldsValue().contact_nm as string) ?? ''} onChange={(e) => form.setFieldsValue({ contact_nm: e.target.value } as Partial<CustomerFormValues>)} />
              </Row>
              <Row label="전화번호">
                <Input name="tel" placeholder="전화번호 입력" maxLength={20} value={(form.getFieldsValue().tel as string) ?? ''} onChange={(e) => form.setFieldsValue({ tel: e.target.value } as Partial<CustomerFormValues>)} />
              </Row>
              <Row label="이메일">
                <Input name="email" placeholder="이메일 입력" type="email" maxLength={100} value={(form.getFieldsValue().email as string) ?? ''} onChange={(e) => form.setFieldsValue({ email: e.target.value } as Partial<CustomerFormValues>)} />
              </Row>
              <Row label="주소">
                <Textarea placeholder="주소 입력" rows={2} maxLength={500} value={(form.getFieldsValue().address as string) ?? ''} onChange={(e) => form.setFieldsValue({ address: e.target.value } as Partial<CustomerFormValues>)} />
              </Row>
            </Section>
          </div>
        )}
      </FormModal>

      <DataHistoryDrawer open={historyOpen} onClose={() => setHistoryOpen(false)} tableName="tb_customer" recordId={historyCd} title={`거래처 변경이력 (${historyCd})`} />
    </div>
  );
}
