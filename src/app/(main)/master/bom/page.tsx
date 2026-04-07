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
  Tabs,
  Tree,
  message,
  Popconfirm,
  Card,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  HistoryOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import type { TablePaginationConfig } from 'antd/es/table';
import type { SorterResult } from 'antd/es/table/interface';
import type { DataNode } from 'antd/es/tree';
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
function buildTreeData(rows: TreeRow[]): DataNode[] {
  if (!rows || rows.length === 0) return [];

  // Build a nested tree from flat rows with tree_level
  interface TreeBuildNode extends DataNode {
    level: number;
  }

  const root: DataNode[] = [];
  const stack: TreeBuildNode[] = [];

  for (const row of rows) {
    const node: TreeBuildNode = {
      key: `${row.bom_id}-${row.child_item_cd}-${row.tree_level}`,
      title: `${row.child_item_cd} - ${row.child_item_nm ?? ''} (수량: ${row.qty})`,
      children: [],
      level: row.tree_level,
    };

    // Pop stack until we find the parent level
    while (stack.length > 0 && stack[stack.length - 1].level >= row.tree_level) {
      stack.pop();
    }

    if (stack.length === 0) {
      root.push(node);
    } else {
      const parent = stack[stack.length - 1];
      if (!parent.children) parent.children = [];
      (parent.children as TreeBuildNode[]).push(node);
    }

    stack.push(node);
  }

  return root;
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
  const [forwardTree, setForwardTree] = useState<DataNode[]>([]);
  const [reverseTree, setReverseTree] = useState<DataNode[]>([]);
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
      message.error(err?.response?.data?.message ?? '품목 조회에 실패했습니다.');
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
        message.error(err?.response?.data?.message ?? 'BOM 목록 조회에 실패했습니다.');
      } finally {
        setLoading(false);
      }
    },
    [pagination.page, pagination.pageSize, selectedParentItemCd],
  );

  // Fetch BOMs when parent changes
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
      message.error(err?.response?.data?.message ?? '정전개 조회에 실패했습니다.');
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
      message.error(err?.response?.data?.message ?? '역전개 조회에 실패했습니다.');
    } finally {
      setTreeLoading(false);
    }
  }, []);

  // Fetch tree on tab switch
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

  // Also fetch tree when parent item changes and a tree tab is active
  useEffect(() => {
    if (!selectedParentItemCd) return;
    if (activeTreeTab === 'forward') {
      fetchForwardTree(selectedParentItemCd);
    } else {
      fetchReverseTree(selectedParentItemCd);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedParentItemCd]);

  /* ── Table change (pagination + sort) ─── */
  const handleTableChange = useCallback(
    (
      paginationConfig: TablePaginationConfig,
      _filters: Record<string, unknown>,
      sorter: SorterResult<BomRow> | SorterResult<BomRow>[],
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
      fetchBomList(newPage, newPageSize, newSortField, newSortOrder);
    },
    [fetchBomList],
  );

  /* ── CRUD handlers ─── */
  const handleCreate = useCallback(() => {
    if (!selectedParentItemCd) {
      message.warning('모품목을 먼저 선택하세요.');
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
      // Also refresh tree
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
        message.success('BOM이 삭제되었습니다.');
        fetchBomList(pagination.page, pagination.pageSize, sortField, sortOrder);
        // Refresh tree
        if (selectedParentItemCd) {
          if (activeTreeTab === 'forward') fetchForwardTree(selectedParentItemCd);
          else fetchReverseTree(selectedParentItemCd);
        }
      } catch (err: any) {
        const msg = err?.response?.data?.message ?? '삭제에 실패했습니다.';
        message.error(msg);
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
  const columns = useMemo(
    () => [
      {
        title: '자품목코드',
        dataIndex: 'child_item_cd',
        width: 130,
        sorter: true,
        ellipsis: true,
      },
      {
        title: '자품목명',
        dataIndex: ['child_item', 'item_nm'],
        width: 200,
        ellipsis: true,
        render: (_: unknown, record: BomRow) => record.child_item?.item_nm ?? '-',
      },
      {
        title: '소요량',
        dataIndex: 'qty',
        width: 100,
        align: 'right' as const,
        sorter: true,
        render: (val: unknown) => {
          if (val == null) return '-';
          return Number(val).toLocaleString();
        },
      },
      {
        title: '손실률(%)',
        dataIndex: 'loss_rate',
        width: 100,
        align: 'right' as const,
        render: (val: unknown) => {
          if (val == null) return '-';
          return `${Number(val)}%`;
        },
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
        align: 'center' as const,
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
        align: 'center' as const,
        fixed: 'right' as const,
        render: (_: unknown, record: BomRow) => (
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
              title="BOM을 삭제하시겠습니까?"
              description="다른 데이터에서 참조 중인 경우 삭제가 거부됩니다."
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
              icon={<HistoryOutlined />}
              onClick={() => handleHistory(record)}
            />
          </Space>
        ),
      },
    ],
    [handleEdit, handleDelete, handleHistory],
  );

  /* ── Parent item table columns ─── */
  const parentItemColumns = useMemo(
    () => [
      {
        title: '품목코드',
        dataIndex: 'item_cd',
        width: 130,
        ellipsis: true,
      },
      {
        title: '품목명',
        dataIndex: 'item_nm',
        width: 200,
        ellipsis: true,
      },
      {
        title: '선택',
        width: 80,
        align: 'center' as const,
        render: (_: unknown, record: ItemOption) => (
          <Button
            size="small"
            type="primary"
            icon={<SearchOutlined />}
            onClick={() => handleSelectParent(record)}
          >
            선택
          </Button>
        ),
      },
    ],
    [handleSelectParent],
  );

  /* ── Tree tab items ─── */
  const treeTabItems = useMemo(
    () => [
      {
        key: 'forward',
        label: '정전개 (Forward)',
        children: (
          <div style={{ minHeight: 200, padding: '8px 0' }}>
            {!selectedParentItemCd ? (
              <div style={{ color: '#999', textAlign: 'center', paddingTop: 40 }}>
                모품목을 선택하세요.
              </div>
            ) : forwardTree.length === 0 ? (
              <div style={{ color: '#999', textAlign: 'center', paddingTop: 40 }}>
                전개 데이터가 없습니다.
              </div>
            ) : (
              <Tree
                treeData={forwardTree}
                defaultExpandAll
                showLine
                selectable={false}
              />
            )}
          </div>
        ),
      },
      {
        key: 'reverse',
        label: '역전개 (Reverse)',
        children: (
          <div style={{ minHeight: 200, padding: '8px 0' }}>
            {!selectedParentItemCd ? (
              <div style={{ color: '#999', textAlign: 'center', paddingTop: 40 }}>
                품목을 선택하세요.
              </div>
            ) : reverseTree.length === 0 ? (
              <div style={{ color: '#999', textAlign: 'center', paddingTop: 40 }}>
                역전개 데이터가 없습니다.
              </div>
            ) : (
              <Tree
                treeData={reverseTree}
                defaultExpandAll
                showLine
                selectable={false}
              />
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
      <Card
        title="모품목 선택"
        size="small"
        style={{ marginBottom: 16 }}
        extra={
          selectedParentItemCd && (
            <Tag color="blue" style={{ fontSize: 13 }}>
              선택: {selectedParentItemNm}
            </Tag>
          )
        }
      >
        <SearchForm
          fields={PARENT_SEARCH_FIELDS}
          onSearch={handleParentSearch}
          onReset={() => setParentItems([])}
          loading={parentLoading}
          extraButtons={
            <Space>
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
            </Space>
          }
        />
        {parentItems.length > 0 && (
          <Table
            columns={parentItemColumns}
            dataSource={parentItems}
            rowKey="item_cd"
            size="small"
            pagination={false}
            scroll={{ y: 200 }}
            style={{ marginTop: 8 }}
          />
        )}
      </Card>

      {/* BOM Detail Table */}
      <Card
        title={`BOM 상세 ${selectedParentItemCd ? `(${selectedParentItemNm})` : ''}`}
        size="small"
        style={{ marginBottom: 16 }}
      >
        {/* Toolbar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <span style={{ color: '#666', fontSize: 13 }}>
            총 <strong>{pagination.total.toLocaleString()}</strong>건
          </span>
          <PermissionButton
            action="create"
            menuUrl={MENU_URL}
            type="primary"
            icon={<PlusOutlined />}
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
          size="small"
          scroll={{ x: 1000 }}
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
      </Card>

      {/* Tree View */}
      <Card title="BOM 전개" size="small">
        <Tabs
          activeKey={activeTreeTab}
          onChange={handleTreeTabChange}
          items={treeTabItems}
        />
        {treeLoading && (
          <div style={{ textAlign: 'center', padding: 20, color: '#999' }}>
            로딩 중...
          </div>
        )}
      </Card>

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
            <Form.Item
              name="parent_item_cd"
              label="모품목코드"
            >
              <Input disabled />
            </Form.Item>
            <Form.Item
              name="child_item_cd"
              label="자품목코드"
              rules={[
                { required: true, message: '자품목코드를 입력하세요.' },
                { max: 30, message: '최대 30자까지 입력 가능합니다.' },
              ]}
            >
              <Input
                placeholder="자품목코드 입력"
                disabled={mode === 'edit'}
                maxLength={30}
              />
            </Form.Item>
            <Form.Item
              name="qty"
              label="소요량"
              rules={[
                { required: true, message: '소요량을 입력하세요.' },
                {
                  type: 'number',
                  min: 0.001,
                  message: '0보다 큰 값을 입력하세요.',
                },
              ]}
            >
              <InputNumber
                placeholder="소요량"
                min={0.001}
                style={{ width: '100%' }}
                precision={3}
              />
            </Form.Item>
            <Form.Item
              name="loss_rate"
              label="손실률(%)"
              rules={[
                {
                  type: 'number',
                  min: 0,
                  max: 100,
                  message: '0~100 사이의 값을 입력하세요.',
                },
              ]}
            >
              <InputNumber
                placeholder="손실률"
                min={0}
                max={100}
                style={{ width: '100%' }}
                precision={2}
              />
            </Form.Item>
            <Form.Item name="alt_item_cd" label="대체품목">
              <Input placeholder="대체품목코드 입력" maxLength={30} />
            </Form.Item>
            <Form.Item name="process_cd" label="공정코드">
              <Input placeholder="공정코드 입력" maxLength={20} />
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
        tableName="tb_bom"
        recordId={historyBomId}
        title={`BOM 변경이력 (${historyBomId})`}
      />
    </div>
  );
}
