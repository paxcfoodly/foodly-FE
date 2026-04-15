'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, Pencil, Trash2, History } from 'lucide-react';
import Button from '@/components/ui/Button';
import Tag from '@/components/ui/Tag';
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

interface InspectStdRow { inspect_std_id: number; item_cd: string | null; process_cd: string | null; inspect_type: string | null; inspect_item_nm: string; measure_type: string | null; lsl: string | number | null; target_val: string | number | null; usl: string | number | null; unit: string | null; sampling_std: string | null; use_yn: string; create_by: string | null; create_dt: string; update_by: string | null; update_dt: string | null; [key: string]: unknown; }
interface InspectStdFormValues { inspect_std_id?: number; item_cd?: string; process_cd?: string; inspect_type?: string; inspect_item_nm: string; measure_type?: string; lsl?: number; target_val?: number; usl?: number; unit?: string; sampling_std?: string; use_yn?: string; [key: string]: unknown; }
interface ItemOption { item_cd: string; item_nm: string; }
interface ProcessOption { process_cd: string; process_nm: string; }

const MENU_URL = '/master/inspection';
const INSPECT_TYPE_OPTIONS = [{ label: '수입검사', value: 'IQC' }, { label: '공정검사', value: 'PQC' }, { label: '출하검사', value: 'OQC' }];
const INSPECT_TYPE_LABEL: Record<string, string> = { IQC: '수입검사', PQC: '공정검사', OQC: '출하검사' };
const INSPECT_TYPE_COLOR: Record<string, string> = { IQC: 'blue', PQC: 'orange', OQC: 'green' };
const MEASURE_TYPE_OPTIONS = [{ label: '계량형', value: 'VARIABLE' }, { label: '계수형', value: 'ATTRIBUTE' }];
const USE_YN_OPTIONS = [{ label: '사용', value: 'Y' }, { label: '미사용', value: 'N' }];

const EXCEL_COLUMNS: ExcelColumn[] = [
  { header: 'ID', key: 'inspect_std_id', width: 8 }, { header: '품목코드', key: 'item_cd', width: 15 }, { header: '공정코드', key: 'process_cd', width: 15 },
  { header: '검사유형', key: 'inspect_type', width: 10 }, { header: '검사항목명', key: 'inspect_item_nm', width: 25 }, { header: '측정유형', key: 'measure_type', width: 10 },
  { header: 'LSL', key: 'lsl', width: 10 }, { header: '목표값', key: 'target_val', width: 10 }, { header: 'USL', key: 'usl', width: 10 },
  { header: '단위', key: 'unit', width: 10 }, { header: '샘플링기준', key: 'sampling_std', width: 15 }, { header: '사용여부', key: 'use_yn', width: 10 },
];
const SEARCH_FIELDS: SearchFieldDef[] = [
  { name: 'inspect_item_nm', label: '검사항목명', type: 'text', placeholder: '검사항목명 입력' },
  { name: 'item_cd', label: '품목코드', type: 'text', placeholder: '품목코드 입력' },
  { name: 'inspect_type', label: '검사유형', type: 'select', options: [{ label: '전체', value: '' }, ...INSPECT_TYPE_OPTIONS] },
  { name: 'use_yn', label: '사용여부', type: 'select', options: [{ label: '전체', value: '' }, ...USE_YN_OPTIONS] },
];

export default function InspectStdMasterPage() {
  const [items, setItems] = useState<InspectStdRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 20, total: 0 });
  const [sortField, setSortField] = useState<string | undefined>();
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc' | undefined>();
  const [filters, setFilters] = useState<Record<string, unknown>>({});
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<FormModalMode>('create');
  const [editItem, setEditItem] = useState<InspectStdRow | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyCd, setHistoryCd] = useState('');
  const [itemOptions, setItemOptions] = useState<{ label: string; value: string }[]>([]);
  const [processOptions, setProcessOptions] = useState<{ label: string; value: string }[]>([]);

  useEffect(() => {
    apiClient.get<PaginatedResponse<ItemOption>>('/v1/items', { params: { limit: 9999, use_yn: 'Y' } }).then((res) => { const list = res.data?.data ?? []; setItemOptions(list.map((i) => ({ label: `${i.item_cd} - ${i.item_nm}`, value: i.item_cd }))); }).catch(() => {});
    apiClient.get<PaginatedResponse<ProcessOption>>('/v1/processes', { params: { limit: 9999, use_yn: 'Y' } }).then((res) => { const list = res.data?.data ?? []; setProcessOptions(list.map((p) => ({ label: `${p.process_cd} - ${p.process_nm}`, value: p.process_cd }))); }).catch(() => {});
  }, []);

  const fetchItems = useCallback(async (page = pagination.page, pageSize = pagination.pageSize, sort?: string, order?: 'asc' | 'desc', sf?: Record<string, unknown>) => {
    setLoading(true);
    try {
      const params: Record<string, unknown> = { page, limit: pageSize }; const af = sf ?? filters;
      if (sort) params.sortBy = sort; if (order) params.sortOrder = order;
      Object.entries(af).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== '') params[k] = v; });
      const res = await apiClient.get<PaginatedResponse<InspectStdRow>>('/v1/inspect-stds', { params }); const body = res.data;
      setItems(body.data ?? []); if (body.pagination) setPagination({ page: body.pagination.page, pageSize: body.pagination.pageSize, total: body.pagination.total });
    } catch (err: any) { toast.error(err?.response?.data?.message ?? '검사기준 목록 조회에 실패했습니다.'); } finally { setLoading(false); }
  }, [filters, pagination.page, pagination.pageSize]);

  useEffect(() => { fetchItems(1, pagination.pageSize, sortField, sortOrder, filters); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  const handleSearch = useCallback((v: Record<string, unknown>) => { setFilters(v); setPagination((p) => ({ ...p, page: 1 })); fetchItems(1, pagination.pageSize, sortField, sortOrder, v); }, [fetchItems, pagination.pageSize, sortField, sortOrder]);
  const handleSearchReset = useCallback(() => { setFilters({}); setPagination((p) => ({ ...p, page: 1 })); fetchItems(1, pagination.pageSize, sortField, sortOrder, {}); }, [fetchItems, pagination.pageSize, sortField, sortOrder]);
  const handleSortChange = useCallback((f: string, o: 'asc' | 'desc') => { setSortField(f); setSortOrder(o); fetchItems(pagination.page, pagination.pageSize, f, o, filters); }, [fetchItems, pagination.page, pagination.pageSize, filters]);
  const handlePageChange = useCallback((p: number, ps: number) => { setPagination((prev) => ({ ...prev, page: p, pageSize: ps })); fetchItems(p, ps, sortField, sortOrder, filters); }, [fetchItems, sortField, sortOrder, filters]);
  const handleCreate = useCallback(() => { setEditItem(null); setModalMode('create'); setModalOpen(true); }, []);
  const handleEdit = useCallback((r: InspectStdRow) => { setEditItem(r); setModalMode('edit'); setModalOpen(true); }, []);

  const handleSubmit = useCallback(async (values: InspectStdFormValues, mode: FormModalMode) => {
    const payload = { item_cd: values.item_cd || null, process_cd: values.process_cd || null, inspect_type: values.inspect_type || null, inspect_item_nm: values.inspect_item_nm, measure_type: values.measure_type || null, lsl: values.lsl ?? null, target_val: values.target_val ?? null, usl: values.usl ?? null, unit: values.unit || null, sampling_std: values.sampling_std || null };
    if (mode === 'create') { await apiClient.post('/v1/inspect-stds', payload); } else { await apiClient.put(`/v1/inspect-stds/${editItem!.inspect_std_id}`, { ...payload, use_yn: values.use_yn }); }
    fetchItems(pagination.page, pagination.pageSize, sortField, sortOrder, filters);
  }, [editItem, fetchItems, pagination.page, pagination.pageSize, sortField, sortOrder, filters]);

  const handleDelete = useCallback(async (r: InspectStdRow) => {
    try { await apiClient.delete(`/v1/inspect-stds/${r.inspect_std_id}`); toast.success('검사기준이 삭제되었습니다.'); fetchItems(pagination.page, pagination.pageSize, sortField, sortOrder, filters); }
    catch (err: any) { toast.error(err?.response?.data?.message ?? '삭제에 실패했습니다.'); }
  }, [fetchItems, pagination.page, pagination.pageSize, sortField, sortOrder, filters]);

  const handleHistory = useCallback((r: InspectStdRow) => { setHistoryCd(String(r.inspect_std_id)); setHistoryOpen(true); }, []);
  const fetchExcelData = useCallback(async () => { const res = await apiClient.get<PaginatedResponse<InspectStdRow>>('/v1/inspect-stds', { params: { limit: 99999 } }); return (res.data?.data ?? []) as Record<string, unknown>[]; }, []);

  const modalInitialValues = useMemo(() => {
    if (!editItem) return undefined;
    return { inspect_std_id: editItem.inspect_std_id, item_cd: editItem.item_cd ?? undefined, process_cd: editItem.process_cd ?? undefined, inspect_type: editItem.inspect_type ?? undefined, inspect_item_nm: editItem.inspect_item_nm, measure_type: editItem.measure_type ?? undefined, lsl: editItem.lsl != null ? Number(editItem.lsl) : undefined, target_val: editItem.target_val != null ? Number(editItem.target_val) : undefined, usl: editItem.usl != null ? Number(editItem.usl) : undefined, unit: editItem.unit ?? undefined, sampling_std: editItem.sampling_std ?? undefined, use_yn: editItem.use_yn } as Partial<InspectStdFormValues>;
  }, [editItem]);

  const columns: TableColumn<InspectStdRow>[] = useMemo(() => [
    { title: 'ID', dataIndex: 'inspect_std_id', width: 60, sorter: true },
    { title: '품목코드', dataIndex: 'item_cd', width: 120, ellipsis: true, render: (v: unknown) => (v as string) || '-' },
    { title: '공정코드', dataIndex: 'process_cd', width: 120, ellipsis: true, render: (v: unknown) => (v as string) || '-' },
    { title: '검사유형', dataIndex: 'inspect_type', width: 90, align: 'center', render: (v: unknown) => { const s = v as string; if (!s) return '-'; return <Tag color={INSPECT_TYPE_COLOR[s] ?? 'default'}>{INSPECT_TYPE_LABEL[s] ?? s}</Tag>; } },
    { title: '검사항목명', dataIndex: 'inspect_item_nm', width: 180, sorter: true, ellipsis: true },
    { title: '측정유형', dataIndex: 'measure_type', width: 80, align: 'center', render: (v: unknown) => (v as string) || '-' },
    { title: 'LSL', dataIndex: 'lsl', width: 80, align: 'right', render: (v: unknown) => v != null ? Number(v).toLocaleString() : '-' },
    { title: '목표값', dataIndex: 'target_val', width: 80, align: 'right', render: (v: unknown) => v != null ? Number(v).toLocaleString() : '-' },
    { title: 'USL', dataIndex: 'usl', width: 80, align: 'right', render: (v: unknown) => v != null ? Number(v).toLocaleString() : '-' },
    { title: '단위', dataIndex: 'unit', width: 60, align: 'center', render: (v: unknown) => (v as string) || '-' },
    { title: '사용여부', dataIndex: 'use_yn', width: 80, align: 'center', render: (v: unknown) => (<Tag color={(v as string) === 'Y' ? 'green' : 'default'}>{(v as string) === 'Y' ? '사용' : '미사용'}</Tag>) },
    { title: '등록일', dataIndex: 'create_dt', width: 110, sorter: true, render: (v: unknown) => (v ? dayjs(v as string).format('YYYY-MM-DD') : '-') },
    { title: '관리', dataIndex: '_action', width: 130, align: 'center', render: (_: unknown, r: InspectStdRow) => (
      <div className="flex items-center gap-1">
        <PermissionButton action="update" menuUrl={MENU_URL} fallback="hide" size="small" variant="ghost" icon={<Pencil className="w-4 h-4" />} onClick={() => handleEdit(r)}>{''}</PermissionButton>
        <PermissionButton action="delete" menuUrl={MENU_URL} fallback="hide" size="small" variant="ghost" className="text-red-500" icon={<Trash2 className="w-4 h-4" />}
          onClick={() => confirm({ title: '검사기준을 삭제하시겠습니까?', content: '다른 데이터에서 참조 중인 경우 삭제가 거부됩니다.', onOk: () => handleDelete(r), okText: '삭제', danger: true })}>{''}</PermissionButton>
        <Button size="small" variant="ghost" icon={<History className="w-4 h-4" />} onClick={() => handleHistory(r)} />
      </div>
    ) },
  ], [handleEdit, handleDelete, handleHistory]);

  const paginationConfig: PaginationConfig = useMemo(() => ({ current: pagination.page, pageSize: pagination.pageSize, total: pagination.total, onChange: handlePageChange, pageSizeOptions: [10, 20, 50, 100] }), [pagination, handlePageChange]);

  return (
    <div>
      <SearchForm fields={SEARCH_FIELDS} onSearch={handleSearch} onReset={handleSearchReset} loading={loading}
        extraButtons={<div className="flex items-center gap-2"><ExcelUploadButton uploadUrl="/v1/inspect-stds/import" onComplete={() => fetchItems(pagination.page, pagination.pageSize, sortField, sortOrder, filters)} /><ExcelDownloadButton filename="검사기준목록" columns={EXCEL_COLUMNS} data={fetchExcelData} /></div>} />
      <div className="flex justify-between items-center mb-3">
        <span className="text-gray-500 text-sm">총 <strong>{pagination.total.toLocaleString()}</strong>건</span>
        <PermissionButton action="create" menuUrl={MENU_URL} variant="primary" icon={<Plus className="w-4 h-4" />} onClick={handleCreate}>검사기준 등록</PermissionButton>
      </div>
      <Table<InspectStdRow> columns={columns} dataSource={items} rowKey="inspect_std_id" loading={loading} pagination={paginationConfig} sortBy={sortField} sortOrder={sortOrder} onSortChange={handleSortChange} scrollX={1500} />

      <FormModal<InspectStdFormValues> open={modalOpen} onClose={() => { setModalOpen(false); setEditItem(null); }} onSubmit={handleSubmit} mode={modalMode} initialValues={modalInitialValues} title={modalMode === 'create' ? '검사기준 등록' : '검사기준 수정'} width={600}>
        {(form, mode) => (
          <div className="space-y-5">
            <Section title="검사 기준 정보">
              <Row label="품목"><Select name="item_cd" placeholder="품목 선택" options={[{ label: '선택 안함', value: '' }, ...itemOptions]} defaultValue={form.getFieldsValue().item_cd ?? ''} onChange={(e) => form.setFieldsValue({ item_cd: e.target.value } as any)} /></Row>
              <Row label="공정"><Select name="process_cd" placeholder="공정 선택" options={[{ label: '선택 안함', value: '' }, ...processOptions]} defaultValue={form.getFieldsValue().process_cd ?? ''} onChange={(e) => form.setFieldsValue({ process_cd: e.target.value } as any)} /></Row>
              <Row label="검사유형"><Select name="inspect_type" placeholder="검사유형 선택" options={[{ label: '선택 안함', value: '' }, ...INSPECT_TYPE_OPTIONS]} defaultValue={form.getFieldsValue().inspect_type ?? ''} onChange={(e) => form.setFieldsValue({ inspect_type: e.target.value } as any)} /></Row>
              <Row label="검사항목명" required><Input name="inspect_item_nm" placeholder="검사항목명 입력" maxLength={200} required defaultValue={form.getFieldsValue().inspect_item_nm ?? ''} onChange={(e) => form.setFieldsValue({ inspect_item_nm: e.target.value } as any)} /></Row>
              <Row label="측정유형"><Select name="measure_type" placeholder="측정유형 선택" options={[{ label: '선택 안함', value: '' }, ...MEASURE_TYPE_OPTIONS]} defaultValue={form.getFieldsValue().measure_type ?? ''} onChange={(e) => form.setFieldsValue({ measure_type: e.target.value } as any)} /></Row>
              {mode === 'edit' && (<Row label="사용여부"><Select name="use_yn" options={USE_YN_OPTIONS} defaultValue={form.getFieldsValue().use_yn ?? 'Y'} onChange={(e) => form.setFieldsValue({ use_yn: e.target.value } as any)} /></Row>)}
            </Section>
            <Section title="측정 범위 / 기준">
              <Row label="LSL (하한)"><input type="number" name="lsl" placeholder="하한값" className="w-full h-9 bg-dark-700 border border-dark-500 rounded-lg px-3 text-sm text-gray-700 focus:outline-none focus:bg-white focus:border-cyan-accent focus:ring-2 focus:ring-cyan-accent/15" defaultValue={form.getFieldsValue().lsl ?? ''} onChange={(e) => form.setFieldsValue({ lsl: e.target.value ? Number(e.target.value) : undefined } as any)} /></Row>
              <Row label="목표값"><input type="number" name="target_val" placeholder="목표값" className="w-full h-9 bg-dark-700 border border-dark-500 rounded-lg px-3 text-sm text-gray-700 focus:outline-none focus:bg-white focus:border-cyan-accent focus:ring-2 focus:ring-cyan-accent/15" defaultValue={form.getFieldsValue().target_val ?? ''} onChange={(e) => form.setFieldsValue({ target_val: e.target.value ? Number(e.target.value) : undefined } as any)} /></Row>
              <Row label="USL (상한)"><input type="number" name="usl" placeholder="상한값" className="w-full h-9 bg-dark-700 border border-dark-500 rounded-lg px-3 text-sm text-gray-700 focus:outline-none focus:bg-white focus:border-cyan-accent focus:ring-2 focus:ring-cyan-accent/15" defaultValue={form.getFieldsValue().usl ?? ''} onChange={(e) => form.setFieldsValue({ usl: e.target.value ? Number(e.target.value) : undefined } as any)} /></Row>
              <Row label="단위"><Input name="unit" placeholder="단위 입력 (mm, kg 등)" maxLength={20} defaultValue={form.getFieldsValue().unit ?? ''} onChange={(e) => form.setFieldsValue({ unit: e.target.value } as any)} /></Row>
              <Row label="샘플링기준"><Input name="sampling_std" placeholder="샘플링기준 입력" maxLength={100} defaultValue={form.getFieldsValue().sampling_std ?? ''} onChange={(e) => form.setFieldsValue({ sampling_std: e.target.value } as any)} /></Row>
            </Section>
          </div>
        )}
      </FormModal>
      <DataHistoryDrawer open={historyOpen} onClose={() => setHistoryOpen(false)} tableName="tb_inspect_std" recordId={historyCd} title={`검사기준 변경이력 (${historyCd})`} />
    </div>
  );
}
