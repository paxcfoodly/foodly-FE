'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Plus,
  Pencil,
  Trash2,
  History,
  Search,
  ChevronRight,
  ChevronDown,
} from 'lucide-react';
import Button from '@/components/ui/Button';
import Tag from '@/components/ui/Tag';
import Tabs from '@/components/ui/Tabs';
import Table from '@/components/ui/Table';
import type { TableColumn, PaginationConfig } from '@/components/ui/Table';
import toast from '@/components/ui/toast';
import { confirm } from '@/components/ui/confirm';
import FormField from '@/components/ui/FormField';
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

/* ── Types ─────────────────────────────────────────── */

interface BomRow {
  bom_id: number;
  parent_item_cd: string;
  child_item_cd: string;
  level_no: number | null;
  qty: number;
  loss_rate: number | null;
  alt_item_cd: string | null;
  process_cd: string | null;
  use_yn: string;
  create_by: string | null;
  create_dt: string;
  update_by: string | null;
  update_dt: string | null;
  parent_item?: { item_nm: string };
  child_item?: { item_nm: string };
  [key: string]: unknown;
}

interface BomFormValues {
  parent_item_cd: string;
  child_item_cd: string;
  qty: number;
  loss_rate?: number;
  alt_item_cd?: string;
  process_cd?: string;
  use_yn?: string;
  [key: string]: unknown;
}

interface TreeRow {
  tree_level: number;
  parent_item_cd: string;
  child_item_cd: string;
  child_item_nm: string | null;
  qty: number;
  loss_rate: number | null;
  bom_id: number;
}

interface ItemOption {
  item_cd: string;
  item_nm: string;
  [key: string]: unknown;
}

interface TreeNode {
  key: string;
  title: string;
  children: TreeNode[];
  level: number;
}

const MENU_URL = '/master/bom';

const USE_YN_OPTIONS = [
  { label: '사용', value: 'Y' },
  { label: '미사용', value: 'N' },
];

/* ── Excel columns ─── */
const EXCEL_COLUMNS: ExcelColumn[] = [
  { header: 'BOM ID', key: 'bom_id', width: 10 },
  { header: '모품목코드', key: 'parent_item_cd', width: 15 },
  { header: '자품목코드', key: 'child_item_cd', width: 15 },
  { header: '소요량', key: 'qty', width: 12 },
  { header: '손실률', key: 'loss_rate', width: 10 },
  { header: '대체품목', key: 'alt_item_cd', width: 15 },
  { header: '공정코드', key: 'process_cd', width: 12 },
  { header: '사용여부', key: 'use_yn', width: 10 },
];

/* ── Parent item search fields ─── */
const PARENT_SEARCH_FIELDS: SearchFieldDef[] = [
  { name: 'item_cd', label: '품목코드', type: 'text', placeholder: '품목코드 입력' },
  { name: 'item_nm', label: '품목명', type: 'text', placeholder: '품목명 입력' },
];

/* ── Tree data helpers ─── */
function buildTreeData(rows: TreeRow[]): TreeNode[] {
  if (!rows || rows.length === 0) return [];

  const root: TreeNode[] = [];
  const stack: TreeNode[] = [];

  for (const row of rows) {
    const node: TreeNode = {
      key: `${row.bom_id}-${row.child_item_cd}-${row.tree_level}`,
      title: `${row.child_item_cd} - ${row.child_item_nm ?? ''} (수량: ${row.qty})`,
      children: [],
      level: row.tree_level,
    };

    while (stack.length > 0 && stack[stack.length - 1].level >= row.tree_level) {
      stack.pop();
    }

    if (stack.length === 0) {
      root.push(node);
    } else {
      const parent = stack[stack.length - 1];
      parent.children.push(node);
    }

    stack.push(node);
  }

  return root;
}

/* ── Simple tree renderer ─── */
function SimpleTree({ nodes, depth = 0 }: { nodes: TreeNode[]; depth?: number }) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    const expand = (ns: TreeNode[]) => {
      ns.forEach((n) => { init[n.key] = true; expand(n.children); });
    };
    expand(nodes);
    return init;
  });

  return (
    <div style={{ paddingLeft: depth > 0 ? 20 : 0 }}>
      {nodes.map((node) => (
        <div key={node.key}>
          <div
            className="flex items-center gap-1 py-1 text-sm cursor-pointer hover:bg-dark-700 rounded px-1"
            onClick={() => setExpanded((prev) => ({ ...prev, [node.key]: !prev[node.key] }))}
          >
            {node.children.length > 0 ? (
              expanded[node.key] ? <ChevronDown className="w-3 h-3 text-gray-400" /> : <ChevronRight className="w-3 h-3 text-gray-400" />
            ) : <span className="w-3" />}
            <span>{node.title}</span>
          </div>
          {expanded[node.key] && node.children.length > 0 && (
            <SimpleTree nodes={node.children} depth={depth + 1} />
          )}
        </div>
      ))}
    </div>
  );
}

/* ── Component ─────────────────────────────────────── */

export default function BomMasterPage() {
  /* ── Parent item selection state ─── */
  const [parentItems, setParentItems] = useState<ItemOption[]>([]);
  const [parentLoading, setParentLoading] = useState(false);
  const [selectedParentItemCd, setSelectedParentItemCd] = useState<string | null>(null);
  const [selectedParentItemNm, setSelectedParentItemNm] = useState<string>('');

  /* ── BOM list state ─── */
  const [bomList, setBomList] = useState<BomRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 20, total: 0 });
  const [sortField, setSortField] = useState<string | undefined>();
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc' | undefined>();

  /* ── Modal state ─── */
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<FormModalMode>('create');
  const [editRecord, setEditRecord] = useState<BomRow | null>(null);

  /* ── Tree state ─── */
  const [activeTreeTab, setActiveTreeTab] = useState<string>('forward');
  const [forwardTree, setForwardTree] = useState<TreeNode[]>([]);
  const [reverseTree, setReverseTree] = useState<TreeNode[]>([]);
  const [treeLoading, setTreeLoading] = useState(false);

  /* ── History state ─── */
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyBomId, setHistoryBomId] = useState('');

  /* ── Parent item search ─── */
  const handleParentSearch = useCallback(async (values: Record<string, unknown>) => {
    setParentLoading(true);
    try {
      const params: Record<string, unknown> = { page: 1, limit: 50 };
      Object.entries(values).forEach(([key, val]) => {
        if (val !== undefined && val !== null && val !== '') {
          params[key] = val;
        }
      });
      const res = await apiClient.get<PaginatedResponse<ItemOption>>('/v1/items', { params });
      setParentItems(res.data.data ?? []);
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? '품목 조회에 실패했습니다.');
    } finally {
      setParentLoading(false);
    }
  }, []);

  const handleSelectParent = useCallback((item: ItemOption) => {
    setSelectedParentItemCd(item.item_cd);
    setSelectedParentItemNm(`${item.item_cd} - ${item.item_nm}`);
    setForwardTree([]);
    setReverseTree([]);
  }, []);

  /* ── BOM list fetching ─── */
  const fetchBomList = useCallback(
    async (
      page = pagination.page,
      pageSize = pagination.pageSize,
      sort?: string,
      order?: 'asc' | 'desc',
      parentCd?: string | null,
    ) => {
      const parent = parentCd !== undefined ? parentCd : selectedParentItemCd;
      if (!parent) {
        setBomList([]);
        setPagination((prev) => ({ ...prev, total: 0 }));
        return;
      }
      setLoading(true);
      try {
        const params: Record<string, unknown> = {
          page,
          limit: pageSize,
          'filter[parent_item_cd]': `eq:${parent}`,
        };
        if (sort) params.sortBy = sort;
        if (order) params.sortOrder = order;

        const res = await apiClient.get<PaginatedResponse<BomRow>>('/v1/boms', { params });
        const body = res.data;
        setBomList(body.data ?? []);
        if (body.pagination) {
          setPagination({
            page: body.pagination.page,
            pageSize: body.pagination.pageSize,
            total: body.pagination.total,
          });
        }
      } catch (err: any) {
        toast.error(err?.response?.data?.message ?? 'BOM 목록 조회에 실패했습니다.');
      } finally {
        setLoading(false);
      }
    },
    [pagination.page, pagination.pageSize, selectedParentItemCd],
  );

  useEffect(() => {
    if (selectedParentItemCd) {
      fetchBomList(1, pagination.pageSize, sortField, sortOrder, selectedParentItemCd);
    } else {
      setBomList([]);
      setPagination((prev) => ({ ...prev, total: 0 }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedParentItemCd]);

  /* ── Tree fetching ─── */
  const fetchForwardTree = useCallback(async (parentCd: string) => {
    setTreeLoading(true);
    try {
      const res = await apiClient.get(`/v1/boms/tree/forward/${encodeURIComponent(parentCd)}`);
      const rows: TreeRow[] = res.data?.data ?? [];
      setForwardTree(buildTreeData(rows));
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? '정전개 조회에 실패했습니다.');
    } finally {
      setTreeLoading(false);
    }
  }, []);

  const fetchReverseTree = useCallback(async (childCd: string) => {
    setTreeLoading(true);
    try {
      const res = await apiClient.get(`/v1/boms/tree/reverse/${encodeURIComponent(childCd)}`);
      const rows: TreeRow[] = res.data?.data ?? [];
      setReverseTree(buildTreeData(rows));
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? '역전개 조회에 실패했습니다.');
    } finally {
      setTreeLoading(false);
    }
  }, []);

  const handleTreeTabChange = useCallback(
    (key: string) => {
      setActiveTreeTab(key);
      if (!selectedParentItemCd) return;
      if (key === 'forward') {
        fetchForwardTree(selectedParentItemCd);
      } else {
        fetchReverseTree(selectedParentItemCd);
      }
    },
    [selectedParentItemCd, fetchForwardTree, fetchReverseTree],
  );

  useEffect(() => {
    if (!selectedParentItemCd) return;
    if (activeTreeTab === 'forward') {
      fetchForwardTree(selectedParentItemCd);
    } else {
      fetchReverseTree(selectedParentItemCd);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedParentItemCd]);

  /* ── Sort / Page change ─── */
  const handleSortChange = useCallback(
    (field: string, order: 'asc' | 'desc') => {
      setSortField(field);
      setSortOrder(order);
      fetchBomList(pagination.page, pagination.pageSize, field, order);
    },
    [fetchBomList, pagination.page, pagination.pageSize],
  );

  const handlePageChange = useCallback(
    (page: number, pageSize: number) => {
      setPagination((prev) => ({ ...prev, page, pageSize }));
      fetchBomList(page, pageSize, sortField, sortOrder);
    },
    [fetchBomList, sortField, sortOrder],
  );

  /* ── CRUD handlers ─── */
  const handleCreate = useCallback(() => {
    if (!selectedParentItemCd) {
      toast.warning('모품목을 먼저 선택하세요.');
      return;
    }
    setEditRecord(null);
    setModalMode('create');
    setModalOpen(true);
  }, [selectedParentItemCd]);

  const handleEdit = useCallback((record: BomRow) => {
    setEditRecord(record);
    setModalMode('edit');
    setModalOpen(true);
  }, []);

  const handleSubmit = useCallback(
    async (values: BomFormValues, mode: FormModalMode) => {
      if (mode === 'create') {
        await apiClient.post('/v1/boms', {
          parent_item_cd: selectedParentItemCd,
          child_item_cd: values.child_item_cd,
          qty: values.qty,
          loss_rate: values.loss_rate ?? null,
          alt_item_cd: values.alt_item_cd || null,
          process_cd: values.process_cd || null,
          use_yn: values.use_yn ?? 'Y',
        });
      } else {
        await apiClient.put(`/v1/boms/${editRecord!.bom_id}`, {
          child_item_cd: values.child_item_cd,
          qty: values.qty,
          loss_rate: values.loss_rate ?? null,
          alt_item_cd: values.alt_item_cd || null,
          process_cd: values.process_cd || null,
          use_yn: values.use_yn,
        });
      }
      fetchBomList(pagination.page, pagination.pageSize, sortField, sortOrder);
      if (selectedParentItemCd) {
        if (activeTreeTab === 'forward') fetchForwardTree(selectedParentItemCd);
        else fetchReverseTree(selectedParentItemCd);
      }
    },
    [
      editRecord,
      selectedParentItemCd,
      fetchBomList,
      pagination.page,
      pagination.pageSize,
      sortField,
      sortOrder,
      activeTreeTab,
      fetchForwardTree,
      fetchReverseTree,
    ],
  );

  const handleDelete = useCallback(
    async (record: BomRow) => {
      try {
        await apiClient.delete(`/v1/boms/${record.bom_id}`);
        toast.success('BOM이 삭제되었습니다.');
        fetchBomList(pagination.page, pagination.pageSize, sortField, sortOrder);
        if (selectedParentItemCd) {
          if (activeTreeTab === 'forward') fetchForwardTree(selectedParentItemCd);
          else fetchReverseTree(selectedParentItemCd);
        }
      } catch (err: any) {
        const msg = err?.response?.data?.message ?? '삭제에 실패했습니다.';
        toast.error(msg);
      }
    },
    [
      fetchBomList,
      pagination.page,
      pagination.pageSize,
      sortField,
      sortOrder,
      selectedParentItemCd,
      activeTreeTab,
      fetchForwardTree,
      fetchReverseTree,
    ],
  );

  /* ── History handler ─── */
  const handleHistory = useCallback((record: BomRow) => {
    setHistoryBomId(String(record.bom_id));
    setHistoryOpen(true);
  }, []);

  /* ── Excel download data fetcher ─── */
  const fetchExcelData = useCallback(async () => {
    const res = await apiClient.get<PaginatedResponse<BomRow>>('/v1/boms/export');
    return (res.data?.data ?? []) as Record<string, unknown>[];
  }, []);

  /* ── Modal initial values ─── */
  const modalInitialValues = useMemo(() => {
    if (!editRecord) {
      return {
        parent_item_cd: selectedParentItemCd ?? '',
        use_yn: 'Y',
      } as Partial<BomFormValues>;
    }
    return {
      parent_item_cd: editRecord.parent_item_cd,
      child_item_cd: editRecord.child_item_cd,
      qty: editRecord.qty,
      loss_rate: editRecord.loss_rate ?? undefined,
      alt_item_cd: editRecord.alt_item_cd ?? undefined,
      process_cd: editRecord.process_cd ?? undefined,
      use_yn: editRecord.use_yn,
    } as Partial<BomFormValues>;
  }, [editRecord, selectedParentItemCd]);

  /* ── Table columns ─── */
  const columns: TableColumn<BomRow>[] = useMemo(
    () => [
      { title: '자품목코드', dataIndex: 'child_item_cd', width: 130, sorter: true, ellipsis: true },
      {
        title: '자품목명',
        dataIndex: 'child_item_cd',
        key: 'child_item_nm',
        width: 200,
        ellipsis: true,
        render: (_: unknown, record: BomRow) => record.child_item?.item_nm ?? '-',
      },
      {
        title: '소요량',
        dataIndex: 'qty',
        width: 100,
        align: 'right',
        sorter: true,
        render: (val: unknown) => val != null ? Number(val).toLocaleString() : '-',
      },
      {
        title: '손실률(%)',
        dataIndex: 'loss_rate',
        width: 100,
        align: 'right',
        render: (val: unknown) => val != null ? `${Number(val)}%` : '-',
      },
      {
        title: '대체품목',
        dataIndex: 'alt_item_cd',
        width: 130,
        ellipsis: true,
        render: (val: unknown) => (val as string) || '-',
      },
      {
        title: '공정코드',
        dataIndex: 'process_cd',
        width: 100,
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
        title: '관리',
        dataIndex: '_action',
        width: 130,
        align: 'center',
        render: (_: unknown, record: BomRow) => (
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
                  title: 'BOM을 삭제하시겠습니까?',
                  content: '다른 데이터에서 참조 중인 경우 삭제가 거부됩니다.',
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
              icon={<History className="w-4 h-4" />}
              onClick={() => handleHistory(record)}
            />
          </div>
        ),
      },
    ],
    [handleEdit, handleDelete, handleHistory],
  );

  /* ── Parent item table columns ─── */
  const parentItemColumns: TableColumn<ItemOption>[] = useMemo(
    () => [
      { title: '품목코드', dataIndex: 'item_cd', width: 130, ellipsis: true },
      { title: '품목명', dataIndex: 'item_nm', width: 200, ellipsis: true },
      {
        title: '선택',
        dataIndex: '_action',
        width: 80,
        align: 'center',
        render: (_: unknown, record: ItemOption) => (
          <Button
            size="small"
            variant="primary"
            icon={<Search className="w-4 h-4" />}
            onClick={() => handleSelectParent(record)}
          >
            선택
          </Button>
        ),
      },
    ],
    [handleSelectParent],
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

  /* ── Tree tab items ─── */
  const treeTabItems = useMemo(
    () => [
      {
        key: 'forward',
        label: '정전개 (Forward)',
        children: (
          <div className="min-h-[200px] py-2">
            {!selectedParentItemCd ? (
              <div className="text-gray-400 text-center pt-10">모품목을 선택하세요.</div>
            ) : forwardTree.length === 0 ? (
              <div className="text-gray-400 text-center pt-10">전개 데이터가 없습니다.</div>
            ) : (
              <SimpleTree nodes={forwardTree} />
            )}
          </div>
        ),
      },
      {
        key: 'reverse',
        label: '역전개 (Reverse)',
        children: (
          <div className="min-h-[200px] py-2">
            {!selectedParentItemCd ? (
              <div className="text-gray-400 text-center pt-10">품목을 선택하세요.</div>
            ) : reverseTree.length === 0 ? (
              <div className="text-gray-400 text-center pt-10">역전개 데이터가 없습니다.</div>
            ) : (
              <SimpleTree nodes={reverseTree} />
            )}
          </div>
        ),
      },
    ],
    [selectedParentItemCd, forwardTree, reverseTree],
  );

  /* ── Render ─── */
  return (
    <div>
      {/* Parent Item Selector */}
      <div className="border border-gray-200 rounded-lg p-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-700">모품목 선택</h3>
          {selectedParentItemCd && (
            <Tag color="blue" className="text-sm">
              선택: {selectedParentItemNm}
            </Tag>
          )}
        </div>
        <SearchForm
          fields={PARENT_SEARCH_FIELDS}
          onSearch={handleParentSearch}
          onReset={() => setParentItems([])}
          loading={parentLoading}
          extraButtons={
            <div className="flex items-center gap-2">
              <ExcelUploadButton
                uploadUrl="/v1/boms/import"
                onComplete={() =>
                  fetchBomList(pagination.page, pagination.pageSize, sortField, sortOrder)
                }
              />
              <ExcelDownloadButton
                filename="BOM목록"
                columns={EXCEL_COLUMNS}
                data={fetchExcelData}
              />
            </div>
          }
        />
        {parentItems.length > 0 && (
          <div className="mt-2">
            <Table<ItemOption>
              columns={parentItemColumns}
              dataSource={parentItems}
              rowKey="item_cd"
              scrollX={400}
            />
          </div>
        )}
      </div>

      {/* BOM Detail Table */}
      <div className="border border-gray-200 rounded-lg p-4 mb-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">
          BOM 상세 {selectedParentItemCd ? `(${selectedParentItemNm})` : ''}
        </h3>

        {/* Toolbar */}
        <div className="flex justify-between items-center mb-3">
          <span className="text-gray-500 text-sm">
            총 <strong>{pagination.total.toLocaleString()}</strong>건
          </span>
          <PermissionButton
            action="create"
            menuUrl={MENU_URL}
            variant="primary"
            icon={<Plus className="w-4 h-4" />}
            onClick={handleCreate}
          >
            BOM 등록
          </PermissionButton>
        </div>

        <Table<BomRow>
          columns={columns}
          dataSource={bomList}
          rowKey="bom_id"
          loading={loading}
          pagination={paginationConfig}
          sortBy={sortField}
          sortOrder={sortOrder}
          onSortChange={handleSortChange}
          scrollX={1000}
        />
      </div>

      {/* Tree View */}
      <div className="border border-gray-200 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">BOM 전개</h3>
        <Tabs
          activeKey={activeTreeTab}
          onChange={handleTreeTabChange}
          items={treeTabItems}
        />
        {treeLoading && (
          <div className="text-center py-5 text-gray-400">로딩 중...</div>
        )}
      </div>

      {/* Create/Edit Modal */}
      <FormModal<BomFormValues>
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditRecord(null);
        }}
        onSubmit={handleSubmit}
        mode={modalMode}
        initialValues={modalInitialValues}
        title={modalMode === 'create' ? 'BOM 등록' : 'BOM 수정'}
        width={520}
      >
        {(form, mode) => (
          <>
            <FormField label="모품목코드">
              <Input
                name="parent_item_cd"
                disabled
                defaultValue={form.getFieldsValue().parent_item_cd ?? ''}
              />
            </FormField>
            <FormField label="자품목코드" required>
              <Input
                name="child_item_cd"
                placeholder="자품목코드 입력"
                disabled={mode === 'edit'}
                maxLength={30}
                required
                defaultValue={form.getFieldsValue().child_item_cd ?? ''}
                onChange={(e) => form.setFieldsValue({ child_item_cd: e.target.value } as Partial<BomFormValues>)}
              />
            </FormField>
            <FormField label="소요량" required>
              <input
                type="number"
                name="qty"
                placeholder="소요량"
                min={0.001}
                step={0.001}
                required
                className="w-full h-9 bg-dark-700 border border-dark-500 rounded-lg px-3 text-sm text-gray-700 focus:outline-none focus:bg-white focus:border-cyan-accent focus:ring-2 focus:ring-cyan-accent/15"
                defaultValue={form.getFieldsValue().qty ?? ''}
                onChange={(e) => form.setFieldsValue({ qty: Number(e.target.value) } as Partial<BomFormValues>)}
              />
            </FormField>
            <FormField label="손실률(%)">
              <input
                type="number"
                name="loss_rate"
                placeholder="손실률"
                min={0}
                max={100}
                step={0.01}
                className="w-full h-9 bg-dark-700 border border-dark-500 rounded-lg px-3 text-sm text-gray-700 focus:outline-none focus:bg-white focus:border-cyan-accent focus:ring-2 focus:ring-cyan-accent/15"
                defaultValue={form.getFieldsValue().loss_rate ?? ''}
                onChange={(e) => form.setFieldsValue({ loss_rate: e.target.value ? Number(e.target.value) : undefined } as Partial<BomFormValues>)}
              />
            </FormField>
            <FormField label="대체품목">
              <Input
                name="alt_item_cd"
                placeholder="대체품목코드 입력"
                maxLength={30}
                defaultValue={form.getFieldsValue().alt_item_cd ?? ''}
                onChange={(e) => form.setFieldsValue({ alt_item_cd: e.target.value } as Partial<BomFormValues>)}
              />
            </FormField>
            <FormField label="공정코드">
              <Input
                name="process_cd"
                placeholder="공정코드 입력"
                maxLength={20}
                defaultValue={form.getFieldsValue().process_cd ?? ''}
                onChange={(e) => form.setFieldsValue({ process_cd: e.target.value } as Partial<BomFormValues>)}
              />
            </FormField>
            {mode === 'edit' && (
              <FormField label="사용여부">
                <Select
                  name="use_yn"
                  options={USE_YN_OPTIONS}
                  defaultValue={form.getFieldsValue().use_yn ?? 'Y'}
                  onChange={(e) => form.setFieldsValue({ use_yn: e.target.value } as Partial<BomFormValues>)}
                />
              </FormField>
            )}
          </>
        )}
      </FormModal>

      {/* History Drawer */}
      <DataHistoryDrawer
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        tableName="tb_bom"
        recordId={historyBomId}
        title={`BOM 변경이력 (${historyBomId})`}
      />
    </div>
  );
}
