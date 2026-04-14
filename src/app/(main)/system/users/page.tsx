'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, Pencil, Trash2, KeyRound } from 'lucide-react';
import Tag from '@/components/ui/Tag';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import FormField from '@/components/ui/FormField';
import toast from '@/components/ui/toast';
import DataGrid, { type DataGridColumn } from '@/components/common/DataGrid';
import SearchForm, { type SearchFieldDef } from '@/components/common/SearchForm';
import FormModal, { type FormModalMode } from '@/components/common/FormModal';
import PermissionButton from '@/components/auth/PermissionButton';
import apiClient from '@/lib/apiClient';
import type { ApiResponse, PaginatedResponse } from '@/types';

/* ── Types ─────────────────────────────────────────── */

interface UserRow {
  user_id: number;
  login_id: string;
  user_nm: string;
  role_cd: string | null;
  company_cd: string | null;
  status: string;
  create_dt: string;
  update_dt: string;
  role: { role_cd: string; role_nm: string } | null;
  company: { company_cd: string; company_nm: string } | null;
  [key: string]: unknown;
}

interface UserFormValues {
  login_id: string;
  password?: string;
  user_nm: string;
  role_cd: string | null;
  status: string;
  [key: string]: unknown;
}

interface RoleOption {
  role_cd: string;
  role_nm: string;
}

const MENU_URL = '/system/users';

/* ── Component ─────────────────────────────────────── */

export default function UsersPage() {
  /* ── State ─── */
  const [dataSource, setDataSource] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [total, setTotal] = useState(0);
  const [sortBy, setSortBy] = useState('user_id');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [searchParams, setSearchParams] = useState<Record<string, unknown>>({});

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<FormModalMode>('create');
  const [editRecord, setEditRecord] = useState<UserRow | null>(null);

  // Delete confirm
  const [deleteTarget, setDeleteTarget] = useState<UserRow | null>(null);

  // Password reset confirm
  const [resetTarget, setResetTarget] = useState<UserRow | null>(null);

  // Role options
  const [roleOptions, setRoleOptions] = useState<RoleOption[]>([]);

  /* ── Fetch roles for dropdown ─── */
  const fetchRoles = useCallback(async () => {
    try {
      const res = await apiClient.get<ApiResponse<{ data: RoleOption[] }>>('/v1/roles');
      const roles = res.data.data?.data ?? res.data.data ?? [];
      setRoleOptions(Array.isArray(roles) ? roles : []);
    } catch {
      // Roles API may require admin role; ignore errors
      setRoleOptions([]);
    }
  }, []);

  useEffect(() => {
    fetchRoles();
  }, [fetchRoles]);

  /* ── Fetch users ─── */
  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, unknown> = {
        page,
        limit: pageSize,
      };

      // Sort
      if (sortBy) {
        params.sort = `${sortBy}:${sortOrder}`;
      }

      // Search filters
      if (searchParams.user_nm) params.search = searchParams.user_nm;
      if (searchParams.role_cd) params.role_cd = searchParams.role_cd;
      if (searchParams.status) params.status = searchParams.status;

      const res = await apiClient.get<ApiResponse<PaginatedResponse<UserRow>>>('/v1/users', { params });

      // API returns: { success, data: [...], pagination: {...} }
      const responseData = res.data;
      const users = responseData.data as unknown;

      if (Array.isArray(users)) {
        setDataSource(users as UserRow[]);
        // pagination may be at the top level
        const pag = (responseData as any).pagination;
        setTotal(pag?.total ?? (users as UserRow[]).length);
      } else if (users && typeof users === 'object' && 'data' in (users as any)) {
        const inner = (users as any).data;
        setDataSource(Array.isArray(inner) ? inner : []);
        setTotal((users as any).pagination?.total ?? inner?.length ?? 0);
      } else {
        setDataSource([]);
        setTotal(0);
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? '사용자 목록 조회에 실패했습니다.');
      setDataSource([]);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, sortBy, sortOrder, searchParams]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  /* ── Search fields ─── */
  const searchFields: SearchFieldDef[] = useMemo(
    () => [
      {
        name: 'user_nm',
        label: '성명 / 로그인ID',
        type: 'text' as const,
        placeholder: '성명 또는 로그인ID 검색',
      },
      {
        name: 'role_cd',
        label: '역할',
        type: 'select' as const,
        placeholder: '전체',
        options: roleOptions.map((r) => ({ label: r.role_nm, value: r.role_cd })),
      },
      {
        name: 'status',
        label: '상태',
        type: 'select' as const,
        placeholder: '전체',
        options: [
          { label: '활성', value: 'ACTIVE' },
          { label: '비활성', value: 'INACTIVE' },
        ],
      },
    ],
    [roleOptions],
  );

  /* ── Columns ─── */
  const columns: DataGridColumn<UserRow>[] = useMemo(
    () => [
      {
        title: '사번',
        dataIndex: 'user_id',
        width: 80,
        sorter: true,
        align: 'center' as const,
      },
      {
        title: '로그인ID',
        dataIndex: 'login_id',
        width: 140,
        sorter: true,
      },
      {
        title: '성명',
        dataIndex: 'user_nm',
        width: 120,
        sorter: true,
      },
      {
        title: '역할',
        dataIndex: 'role_cd',
        width: 120,
        render: (_: unknown, record: UserRow) =>
          record.role?.role_nm ?? record.role_cd ?? '-',
      },
      {
        title: '상태',
        dataIndex: 'status',
        width: 80,
        align: 'center' as const,
        render: (val: unknown) => {
          const status = val as string;
          return (
            <Tag color={status === 'ACTIVE' ? 'green' : 'gray'}>
              {status === 'ACTIVE' ? '활성' : '비활성'}
            </Tag>
          );
        },
      },
      {
        title: '등록일시',
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
        width: 200,
        fixed: 'right' as const,
        render: (_: unknown, record: UserRow) => (
          <div className="flex items-center gap-2">
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
              action="update"
              menuUrl={MENU_URL}
              fallback="hide"
              size="small"
              icon={<KeyRound className="w-4 h-4" />}
              onClick={() => setResetTarget(record)}
            >
              비번초기화
            </PermissionButton>
            {record.status !== 'INACTIVE' && (
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
            )}
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

  const handleEdit = useCallback((record: UserRow) => {
    setEditRecord(record);
    setModalMode('edit');
    setModalOpen(true);
  }, []);

  const handleModalClose = useCallback(() => {
    setModalOpen(false);
    setEditRecord(null);
  }, []);

  /* ── Submit create / edit ─── */
  const handleSubmit = useCallback(
    async (values: UserFormValues, mode: FormModalMode) => {
      if (mode === 'create') {
        await apiClient.post('/v1/users', {
          login_id: values.login_id,
          password: values.password,
          user_nm: values.user_nm,
          role_cd: values.role_cd || null,
        });
      } else {
        await apiClient.put(`/v1/users/${editRecord!.user_id}`, {
          user_nm: values.user_nm,
          role_cd: values.role_cd || null,
          status: values.status,
        });
      }
      fetchUsers();
    },
    [editRecord, fetchUsers],
  );

  /* ── Delete (soft) ─── */
  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    try {
      await apiClient.delete(`/v1/users/${deleteTarget.user_id}`);
      toast.success('사용자가 삭제(비활성화)되었습니다.');
      setDeleteTarget(null);
      fetchUsers();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? '삭제에 실패했습니다.');
    }
  }, [deleteTarget, fetchUsers]);

  /* ── Password reset ─── */
  const handleResetPassword = useCallback(async () => {
    if (!resetTarget) return;
    try {
      await apiClient.post(`/v1/users/${resetTarget.user_id}/reset-password`);
      toast.success(`${resetTarget.user_nm}님의 비밀번호가 초기화되었습니다.`);
      setResetTarget(null);
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? '비밀번호 초기화에 실패했습니다.');
    }
  }, [resetTarget]);

  /* ── Form initial values ─── */
  const formInitialValues = useMemo(() => {
    if (!editRecord) return undefined;
    return {
      login_id: editRecord.login_id,
      user_nm: editRecord.user_nm,
      role_cd: editRecord.role_cd ?? undefined,
      status: editRecord.status,
    } as Partial<UserFormValues>;
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
            사용자 등록
          </PermissionButton>
        }
      />

      {/* 데이터 그리드 */}
      <DataGrid<UserRow>
        columns={columns}
        dataSource={dataSource}
        rowKey="user_id"
        loading={loading}
        page={page}
        pageSize={pageSize}
        total={total}
        onPageChange={handlePageChange}
        sortBy={sortBy}
        sortOrder={sortOrder}
        onSortChange={handleSortChange}
        scrollX={1000}
      />

      {/* 등록/수정 모달 */}
      <FormModal<UserFormValues>
        open={modalOpen}
        onClose={handleModalClose}
        onSubmit={handleSubmit}
        mode={modalMode}
        initialValues={formInitialValues}
        title={modalMode === 'create' ? '사용자 등록' : '사용자 수정'}
        width={560}
      >
        {(form, mode) => (
          <>
            <FormField label="로그인ID" required>
              <Input
                name="login_id"
                placeholder="로그인ID"
                disabled={mode === 'edit'}
                maxLength={50}
                required
                minLength={2}
                value={(form.getFieldsValue().login_id as string) ?? ''}
                onChange={(e) => form.setFieldsValue({ login_id: e.target.value } as Partial<UserFormValues>)}
              />
            </FormField>

            <FormField label="성명" required>
              <Input
                name="user_nm"
                placeholder="성명"
                maxLength={50}
                required
                value={(form.getFieldsValue().user_nm as string) ?? ''}
                onChange={(e) => form.setFieldsValue({ user_nm: e.target.value } as Partial<UserFormValues>)}
              />
            </FormField>

            {mode === 'create' && (
              <FormField label="비밀번호" required>
                <input
                  type="password"
                  name="password"
                  placeholder="비밀번호 (6자 이상)"
                  required
                  minLength={6}
                  className="w-full h-9 bg-dark-700 border border-dark-500 rounded-lg px-3 text-sm text-gray-700 placeholder-gray-400 transition-all focus:outline-none focus:bg-white focus:border-cyan-accent focus:ring-2 focus:ring-cyan-accent/15"
                  value={(form.getFieldsValue().password as string) ?? ''}
                  onChange={(e) => form.setFieldsValue({ password: e.target.value } as Partial<UserFormValues>)}
                />
              </FormField>
            )}

            <FormField label="역할">
              <Select
                name="role_cd"
                placeholder="역할 선택"
                value={(form.getFieldsValue().role_cd as string) ?? ''}
                onChange={(e) => form.setFieldsValue({ role_cd: e.target.value || null } as Partial<UserFormValues>)}
                options={roleOptions.map((r) => ({
                  label: r.role_nm,
                  value: r.role_cd,
                }))}
              />
            </FormField>

            {mode === 'edit' && (
              <FormField label="상태">
                <Select
                  name="status"
                  value={(form.getFieldsValue().status as string) ?? ''}
                  onChange={(e) => form.setFieldsValue({ status: e.target.value } as Partial<UserFormValues>)}
                  options={[
                    { label: '활성', value: 'ACTIVE' },
                    { label: '비활성', value: 'INACTIVE' },
                  ]}
                />
              </FormField>
            )}
          </>
        )}
      </FormModal>

      {/* 삭제 확인 모달 */}
      <Modal
        open={!!deleteTarget}
        title="사용자 삭제"
        onClose={() => setDeleteTarget(null)}
        footer={
          <div className="flex items-center gap-2">
            <Button onClick={() => setDeleteTarget(null)}>취소</Button>
            <Button variant="danger" onClick={handleDelete}>삭제</Button>
          </div>
        }
      >
        <p>
          <strong>{deleteTarget?.user_nm}</strong> ({deleteTarget?.login_id})
          님을 삭제(비활성화)하시겠습니까?
        </p>
        <p className="text-gray-400 text-[13px]">
          ※ 논리 삭제로 상태가 비활성으로 변경됩니다.
        </p>
      </Modal>

      {/* 비밀번호 초기화 확인 모달 */}
      <Modal
        open={!!resetTarget}
        title="비밀번호 초기화"
        onClose={() => setResetTarget(null)}
        footer={
          <div className="flex items-center gap-2">
            <Button onClick={() => setResetTarget(null)}>취소</Button>
            <Button variant="primary" onClick={handleResetPassword}>초기화</Button>
          </div>
        }
      >
        <p>
          <strong>{resetTarget?.user_nm}</strong> ({resetTarget?.login_id})
          님의 비밀번호를 초기화하시겠습니까?
        </p>
        <p className="text-gray-400 text-[13px]">
          ※ 기본 비밀번호(foodly1234!)로 초기화됩니다.
        </p>
      </Modal>
    </div>
  );
}
