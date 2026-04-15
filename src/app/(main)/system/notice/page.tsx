'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, Pencil, Trash2, Bell } from 'lucide-react';
import Tag from '@/components/ui/Tag';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import { Section, Row } from '@/components/ui/Section';
import toast from '@/components/ui/toast';
import DataGrid, { type DataGridColumn } from '@/components/common/DataGrid';
import SearchForm, { type SearchFieldDef } from '@/components/common/SearchForm';
import FormModal, { type FormModalMode } from '@/components/common/FormModal';
import PermissionButton from '@/components/auth/PermissionButton';
import apiClient from '@/lib/apiClient';
import type { ApiResponse, PaginatedResponse } from '@/types';

/* ── Types ─────────────────────────────────────────── */

interface NoticeRow {
  notice_id: number;
  title: string;
  content: string | null;
  is_popup: string; // Y/N
  create_by: string | null;
  create_dt: string;
  update_dt: string;
  [key: string]: unknown;
}

interface NoticeFormValues {
  title: string;
  content?: string;
  is_popup?: string;
  [key: string]: unknown;
}

const MENU_URL = '/system/notice';

/* ── Component ─────────────────────────────────────── */

export default function NoticePage() {
  /* ── State ─── */
  const [dataSource, setDataSource] = useState<NoticeRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [total, setTotal] = useState(0);
  const [sortBy, setSortBy] = useState('notice_id');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [searchParams, setSearchParams] = useState<Record<string, unknown>>({});

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<FormModalMode>('create');
  const [editRecord, setEditRecord] = useState<NoticeRow | null>(null);

  // Delete confirm
  const [deleteTarget, setDeleteTarget] = useState<NoticeRow | null>(null);

  // View modal
  const [viewRecord, setViewRecord] = useState<NoticeRow | null>(null);

  /* ── Fetch notices ─── */
  const fetchNotices = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, unknown> = {
        page,
        limit: pageSize,
      };
      if (sortBy) params.sort = `${sortBy}:${sortOrder}`;

      if (searchParams.search) params.search = searchParams.search;
      if (searchParams.is_popup) params.is_popup = searchParams.is_popup;

      const res = await apiClient.get<ApiResponse<PaginatedResponse<NoticeRow>>>('/v1/notices', {
        params,
      });
      const responseData = res.data;
      const notices = responseData.data as unknown;

      if (Array.isArray(notices)) {
        setDataSource(notices as NoticeRow[]);
        const pag = (responseData as any).pagination;
        setTotal(pag?.total ?? (notices as NoticeRow[]).length);
      } else {
        setDataSource([]);
        setTotal(0);
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? '공지사항 조회에 실패했습니다.');
      setDataSource([]);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, sortBy, sortOrder, searchParams]);

  useEffect(() => {
    fetchNotices();
  }, [fetchNotices]);

  /* ── Search fields ─── */
  const searchFields: SearchFieldDef[] = useMemo(
    () => [
      {
        name: 'search',
        label: '제목',
        type: 'text' as const,
        placeholder: '제목 검색',
      },
      {
        name: 'is_popup',
        label: '팝업',
        type: 'select' as const,
        placeholder: '전체',
        options: [
          { label: '팝업 공지', value: 'Y' },
          { label: '일반 공지', value: 'N' },
        ],
      },
    ],
    [],
  );

  /* ── Columns ─── */
  const columns: DataGridColumn<NoticeRow>[] = useMemo(
    () => [
      {
        title: 'No',
        dataIndex: 'notice_id',
        width: 70,
        sorter: true,
        align: 'center' as const,
      },
      {
        title: '제목',
        dataIndex: 'title',
        sorter: true,
        ellipsis: true,
        render: (val: unknown, record: NoticeRow) => (
          <button
            onClick={() => setViewRecord(record)}
            className="text-cyan-accent hover:underline text-left"
          >
            {record.is_popup === 'Y' && (
              <Bell className="w-4 h-4 text-red-500 inline mr-1.5" />
            )}
            {val as string}
          </button>
        ),
      },
      {
        title: '팝업',
        dataIndex: 'is_popup',
        width: 80,
        sorter: true,
        align: 'center' as const,
        render: (val: unknown) => (
          <Tag color={(val as string) === 'Y' ? 'red' : 'gray'}>
            {(val as string) === 'Y' ? '팝업' : '일반'}
          </Tag>
        ),
      },
      {
        title: '작성자',
        dataIndex: 'create_by',
        width: 100,
        render: (val: unknown) => (val as string) ?? '-',
      },
      {
        title: '등록일',
        dataIndex: 'create_dt',
        width: 160,
        sorter: true,
        render: (val: unknown) => {
          if (!val) return '-';
          return new Date(val as string).toLocaleString('ko-KR');
        },
      },
      {
        title: '관리',
        dataIndex: '_action',
        width: 140,
        fixed: 'right' as const,
        align: 'center' as const,
        render: (_: unknown, record: NoticeRow) => (
          <div className="flex items-center gap-2 justify-center">
            <PermissionButton
              action="update"
              menuUrl={MENU_URL}
              fallback="hide"
              size="small"
              icon={<Pencil className="w-4 h-4" />}
              onClick={() => handleEdit(record)}
            >
              수정
            </PermissionButton>
            <PermissionButton
              action="delete"
              menuUrl={MENU_URL}
              fallback="hide"
              size="small"
              variant="danger"
              icon={<Trash2 className="w-4 h-4" />}
              onClick={() => setDeleteTarget(record)}
            >
              삭제
            </PermissionButton>
          </div>
        ),
      },
    ],
    [], // eslint-disable-line react-hooks/exhaustive-deps
  );

  /* ── Handlers ─── */
  const handleSearch = useCallback((values: Record<string, unknown>) => {
    setPage(1);
    setSearchParams(values);
  }, []);

  const handleReset = useCallback(() => {
    setPage(1);
    setSearchParams({});
  }, []);

  const handlePageChange = useCallback((p: number, ps: number) => {
    setPage(p);
    setPageSize(ps);
  }, []);

  const handleSortChange = useCallback((field: string, order: 'asc' | 'desc') => {
    setSortBy(field);
    setSortOrder(order);
  }, []);

  const handleCreate = useCallback(() => {
    setEditRecord(null);
    setModalMode('create');
    setModalOpen(true);
  }, []);

  const handleEdit = useCallback((record: NoticeRow) => {
    setEditRecord(record);
    setModalMode('edit');
    setModalOpen(true);
  }, []);

  const handleModalClose = useCallback(() => {
    setModalOpen(false);
    setEditRecord(null);
  }, []);

  const handleSubmit = useCallback(
    async (values: NoticeFormValues, mode: FormModalMode) => {
      if (mode === 'create') {
        await apiClient.post('/v1/notices', {
          title: values.title,
          content: values.content || null,
          is_popup: values.is_popup ?? 'N',
        });
      } else {
        await apiClient.put(`/v1/notices/${editRecord!.notice_id}`, {
          title: values.title,
          content: values.content || null,
          is_popup: values.is_popup ?? 'N',
        });
      }
      fetchNotices();
    },
    [editRecord, fetchNotices],
  );

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    try {
      await apiClient.delete(`/v1/notices/${deleteTarget.notice_id}`);
      toast.success('공지사항이 삭제되었습니다.');
      setDeleteTarget(null);
      fetchNotices();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? '삭제에 실패했습니다.');
    }
  }, [deleteTarget, fetchNotices]);

  const formInitialValues = useMemo(() => {
    if (!editRecord) return undefined;
    return {
      title: editRecord.title,
      content: editRecord.content ?? '',
      is_popup: editRecord.is_popup,
    } as Partial<NoticeFormValues>;
  }, [editRecord]);

  /* ── Render ─── */
  return (
    <div>
      {/* 검색 영역 */}
      <SearchForm
        fields={searchFields}
        onSearch={handleSearch}
        onReset={handleReset}
        loading={loading}
        extraButtons={
          <PermissionButton
            action="create"
            menuUrl={MENU_URL}
            variant="primary"
            icon={<Plus className="w-4 h-4" />}
            onClick={handleCreate}
          >
            공지 등록
          </PermissionButton>
        }
      />

      {/* 데이터 그리드 */}
      <DataGrid<NoticeRow> storageKey="system-notice"
        columns={columns}
        dataSource={dataSource}
        rowKey="notice_id"
        loading={loading}
        page={page}
        pageSize={pageSize}
        total={total}
        onPageChange={handlePageChange}
        sortBy={sortBy}
        sortOrder={sortOrder}
        onSortChange={handleSortChange}
        scrollX={900}
      />

      {/* 등록/수정 모달 */}
      <FormModal<NoticeFormValues>
        open={modalOpen}
        onClose={handleModalClose}
        onSubmit={handleSubmit}
        mode={modalMode}
        initialValues={formInitialValues}
        title={modalMode === 'create' ? '공지사항 등록' : '공지사항 수정'}
        width={640}
      >
        {(form) => (
          <Section title="공지 정보">
            <Row label="제목" required>
              <Input
                name="title"
                placeholder="공지사항 제목"
                maxLength={200}
                required
                value={(form.getFieldsValue().title as string) ?? ''}
                onChange={(e) => form.setFieldsValue({ title: e.target.value } as Partial<NoticeFormValues>)}
              />
            </Row>
            <Row label="내용">
              <Textarea
                name="content"
                placeholder="공지사항 내용을 입력하세요."
                rows={8}
                maxLength={5000}
                value={(form.getFieldsValue().content as string) ?? ''}
                onChange={(e) => form.setFieldsValue({ content: e.target.value } as Partial<NoticeFormValues>)}
              />
            </Row>
            <Row label="팝업 공지">
              <Select
                name="is_popup"
                placeholder="일반 공지"
                value={(form.getFieldsValue().is_popup as string) ?? ''}
                onChange={(e) => form.setFieldsValue({ is_popup: e.target.value } as Partial<NoticeFormValues>)}
                options={[
                  { label: '일반 공지', value: 'N' },
                  { label: '팝업 공지', value: 'Y' },
                ]}
              />
            </Row>
          </Section>
        )}
      </FormModal>

      {/* 삭제 확인 모달 */}
      <Modal
        open={!!deleteTarget}
        title="공지사항 삭제"
        onClose={() => setDeleteTarget(null)}
        footer={
          <div className="flex items-center gap-2">
            <Button onClick={() => setDeleteTarget(null)}>취소</Button>
            <Button variant="danger" onClick={handleDelete}>삭제</Button>
          </div>
        }
      >
        <p>
          <strong>{deleteTarget?.title}</strong> 공지를 삭제하시겠습니까?
        </p>
      </Modal>

      {/* 상세 보기 모달 */}
      <Modal
        open={!!viewRecord}
        title={viewRecord?.title ?? '공지사항'}
        width={640}
        onClose={() => setViewRecord(null)}
      >
        {viewRecord && (
          <>
            <div className="mb-2">
              <Tag color={viewRecord.is_popup === 'Y' ? 'red' : 'gray'}>
                {viewRecord.is_popup === 'Y' ? '팝업 공지' : '일반 공지'}
              </Tag>
              <span className="text-xs text-gray-400 ml-2">
                작성자: {viewRecord.create_by ?? '-'} |{' '}
                {new Date(viewRecord.create_dt).toLocaleString('ko-KR')}
              </span>
            </div>
            <div className="p-4 bg-gray-50 rounded min-h-[100px] whitespace-pre-wrap leading-relaxed">
              {viewRecord.content || '(내용 없음)'}
            </div>
          </>
        )}
      </Modal>
    </div>
  );
}
