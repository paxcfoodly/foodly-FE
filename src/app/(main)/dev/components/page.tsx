'use client';

import React, { useCallback, useState } from 'react';
import { Card, Typography, Tag, message, Button, Space, Form, Input } from 'antd';
import { HistoryOutlined } from '@ant-design/icons';
import DataGrid, { type DataGridColumn } from '@/components/common/DataGrid';
import SearchForm, { type SearchFieldDef } from '@/components/common/SearchForm';
import CommonCodeSelect from '@/components/common/CommonCodeSelect';
import FormModal from '@/components/common/FormModal';
import { confirmModal, alertModal } from '@/components/common/modalUtils';
import ExcelDownloadButton from '@/components/common/ExcelDownloadButton';
import ExcelUploadButton from '@/components/common/ExcelUploadButton';
import FileUpload from '@/components/common/FileUpload';
import DataHistoryDrawer from '@/components/common/DataHistoryDrawer';

const { Title } = Typography;

/* ── Mock 데이터 ─── */

interface SampleItem extends Record<string, unknown> {
  id: number;
  itemCd: string;
  itemNm: string;
  itemType: string;
  unit: string;
  spec: string;
  useYn: string;
}

function generateMockData(page: number, pageSize: number): { data: SampleItem[]; total: number } {
  const total = 123;
  const start = (page - 1) * pageSize;
  const count = Math.min(pageSize, total - start);
  const data: SampleItem[] = Array.from({ length: Math.max(0, count) }, (_, i) => {
    const idx = start + i + 1;
    return {
      id: idx,
      itemCd: `ITM-${String(idx).padStart(5, '0')}`,
      itemNm: `품목 ${idx}`,
      itemType: idx % 3 === 0 ? '원자재' : idx % 3 === 1 ? '반제품' : '완제품',
      unit: idx % 2 === 0 ? 'kg' : 'EA',
      spec: `${10 + idx}mm × ${20 + idx}mm`,
      useYn: idx % 10 === 0 ? 'N' : 'Y',
    };
  });
  return { data, total };
}

/* ── 검색 필드 정의 ─── */

const searchFields: SearchFieldDef[] = [
  { name: 'itemCd', label: '품목코드', type: 'text', placeholder: '품목코드 입력' },
  { name: 'itemNm', label: '품목명', type: 'text', placeholder: '품목명 입력' },
  {
    name: 'itemType',
    label: '품목유형',
    type: 'select',
    options: [
      { label: '원자재', value: '원자재' },
      { label: '반제품', value: '반제품' },
      { label: '완제품', value: '완제품' },
    ],
  },
  {
    name: 'useYn',
    label: '사용여부',
    type: 'select',
    options: [
      { label: '사용', value: 'Y' },
      { label: '미사용', value: 'N' },
    ],
  },
  { name: 'regDate', label: '등록일', type: 'dateRange', span: 8 },
];

/* ── 그리드 컬럼 정의 ─── */

const gridColumns: DataGridColumn<SampleItem>[] = [
  { title: '품목코드', dataIndex: 'itemCd', width: 140, sorter: true },
  { title: '품목명', dataIndex: 'itemNm', width: 200, sorter: true },
  { title: '품목유형', dataIndex: 'itemType', width: 100, align: 'center' },
  { title: '단위', dataIndex: 'unit', width: 80, align: 'center' },
  { title: '규격', dataIndex: 'spec', width: 160 },
  {
    title: '사용여부',
    dataIndex: 'useYn',
    width: 90,
    align: 'center',
    render: (val: unknown) => (
      <Tag color={val === 'Y' ? 'green' : 'red'}>{val === 'Y' ? '사용' : '미사용'}</Tag>
    ),
  },
];

/* ── 엑셀 컬럼 정의 ─── */

const excelColumns = [
  { header: '품목코드', key: 'itemCd', width: 18 },
  { header: '품목명', key: 'itemNm', width: 25 },
  { header: '품목유형', key: 'itemType', width: 12 },
  { header: '단위', key: 'unit', width: 8 },
  { header: '규격', key: 'spec', width: 20 },
  { header: '사용여부', key: 'useYn', width: 10 },
];

/* ── Page Component ─── */

export default function ComponentDemoPage() {
  const [loading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [sortBy, setSortBy] = useState('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [selectedKeys, setSelectedKeys] = useState<React.Key[]>([]);

  // FormModal state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit' | 'view'>('create');
  const [editItem, setEditItem] = useState<Partial<SampleItem> | undefined>();

  // DataHistoryDrawer state
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyRecordId, setHistoryRecordId] = useState('');

  const { data, total } = generateMockData(page, pageSize);

  const handleSearch = useCallback((values: Record<string, unknown>) => {
    setPage(1);
    message.success(`검색 실행: ${JSON.stringify(values)}`);
  }, []);

  const handleReset = useCallback(() => {
    setPage(1);
  }, []);

  const handlePageChange = useCallback((p: number, ps: number) => {
    setPage(p);
    setPageSize(ps);
  }, []);

  const handleSortChange = useCallback((field: string, order: 'asc' | 'desc') => {
    setSortBy(field);
    setSortOrder(order);
  }, []);

  /* FormModal handlers */
  const openCreateModal = useCallback(() => {
    setEditItem(undefined);
    setModalMode('create');
    setModalOpen(true);
  }, []);

  const openEditModal = useCallback(() => {
    if (data.length > 0) {
      setEditItem(data[0]);
      setModalMode('edit');
      setModalOpen(true);
    }
  }, [data]);

  const handleModalSubmit = useCallback(async (values: Record<string, unknown>) => {
    console.log('FormModal submit:', values);
    // In real usage, call API here
  }, []);

  /* Confirm / Alert modal handlers */
  const handleConfirm = useCallback(async () => {
    const ok = await confirmModal({
      title: '삭제 확인',
      content: '선택한 항목을 삭제하시겠습니까?',
    });
    message.info(ok ? '삭제 확인됨' : '삭제 취소됨');
  }, []);

  const handleAlert = useCallback(async () => {
    await alertModal({ title: '알림', content: '저장이 완료되었습니다.' });
  }, []);

  /* History drawer */
  const openHistory = useCallback(() => {
    setHistoryRecordId('1');
    setHistoryOpen(true);
  }, []);

  return (
    <div style={{ padding: 0 }}>
      <Title level={4}>공통 컴포넌트 데모</Title>

      <Title level={5} style={{ marginTop: 16 }}>SearchForm + CommonCodeSelect</Title>
      <SearchForm
        fields={searchFields}
        onSearch={handleSearch}
        onReset={handleReset}
        loading={loading}
        collapsedRows={1}
      />

      <Card size="small" title="CommonCodeSelect 단독 사용" style={{ marginBottom: 16 }}>
        <CommonCodeSelect
          groupCd="ITEM_TYPE"
          showAll
          style={{ width: 240 }}
          placeholder="품목유형 선택"
        />
      </Card>

      {/* ── 모달 데모 ─── */}
      <Title level={5}>FormModal / Confirm / Alert</Title>
      <Card size="small" style={{ marginBottom: 16 }}>
        <Space wrap>
          <Button type="primary" onClick={openCreateModal}>
            신규 등록 모달
          </Button>
          <Button onClick={openEditModal}>수정 모달</Button>
          <Button danger onClick={handleConfirm}>
            삭제 확인 모달
          </Button>
          <Button onClick={handleAlert}>알림 모달</Button>
        </Space>
      </Card>

      <FormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleModalSubmit}
        mode={modalMode}
        initialValues={editItem}
        title={modalMode === 'create' ? '품목 등록' : '품목 수정'}
      >
        {(form, mode) => (
          <>
            <Form.Item
              name="itemCd"
              label="품목코드"
              rules={[{ required: true, message: '품목코드를 입력하세요' }]}
            >
              <Input disabled={mode === 'edit'} placeholder="ITM-00001" />
            </Form.Item>
            <Form.Item
              name="itemNm"
              label="품목명"
              rules={[{ required: true, message: '품목명을 입력하세요' }]}
            >
              <Input placeholder="품목명 입력" />
            </Form.Item>
            <Form.Item name="spec" label="규격">
              <Input placeholder="규격 입력" />
            </Form.Item>
          </>
        )}
      </FormModal>

      {/* ── 엑셀 / 파일 데모 ─── */}
      <Title level={5}>엑셀 다운로드 / 업로드 / 파일 업로드</Title>
      <Card size="small" style={{ marginBottom: 16 }}>
        <Space wrap>
          <ExcelDownloadButton
            filename="품목목록"
            columns={excelColumns}
            data={data}
          />
          <ExcelUploadButton
            uploadUrl="/v1/items/import"
            onComplete={(r) => message.info(`업로드 완료: 성공 ${r.successCount}, 실패 ${r.errorCount}`)}
          />
        </Space>
      </Card>

      <Card size="small" title="파일 업로드" style={{ marginBottom: 16 }}>
        <FileUpload
          maxCount={3}
          maxSizeMB={5}
          accept=".jpg,.png,.pdf"
          refTable="TB_ITEM"
          refId="1"
          dragger
        />
      </Card>

      {/* ── 변경이력 데모 ─── */}
      <Title level={5}>변경이력 드로어</Title>
      <Card size="small" style={{ marginBottom: 16 }}>
        <Button icon={<HistoryOutlined />} onClick={openHistory}>
          변경이력 보기
        </Button>
      </Card>

      <DataHistoryDrawer
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        tableName="TB_ITEM"
        recordId={historyRecordId}
      />

      {/* ── DataGrid ─── */}
      <Title level={5}>DataGrid</Title>
      <DataGrid<SampleItem>
        columns={gridColumns}
        dataSource={data}
        rowKey="id"
        loading={loading}
        page={page}
        pageSize={pageSize}
        total={total}
        onPageChange={handlePageChange}
        sortBy={sortBy}
        sortOrder={sortOrder}
        onSortChange={handleSortChange}
        selectionMode="multiple"
        selectedRowKeys={selectedKeys}
        onSelectionChange={(keys) => setSelectedKeys(keys)}
        title="품목 목록"
        scrollX={900}
      />

      {selectedKeys.length > 0 && (
        <Card size="small" style={{ marginTop: 8 }}>
          선택된 행: {selectedKeys.join(', ')}
        </Card>
      )}
    </div>
  );
}
