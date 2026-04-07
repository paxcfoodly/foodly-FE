'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Button, Space, Tag, Modal, Form, Input, Select, message } from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  KeyOutlined,
} from '@ant-design/icons';
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
      message.error(err?.response?.data?.message ?? '사용자 목록 조회에 실패했습니다.');
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
            <Tag color={status === 'ACTIVE' ? 'green' : 'default'}>
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
          <Space size="small">
            <PermissionButton
              action="update"
              menuUrl={MENU_URL}
              fallback="hide"
              size="small"
              icon={<EditOutlined />}
              onClick={() => handleEdit(record)}
            >
              수정
            </PermissionButton>
            <PermissionButton
              action="update"
              menuUrl={MENU_URL}
              fallback="hide"
              size="small"
              icon={<KeyOutlined />}
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
                danger
                icon={<DeleteOutlined />}
                onClick={() => setDeleteTarget(record)}
              >
                삭제
              </PermissionButton>
            )}
          </Space>
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
      message.success('사용자가 삭제(비활성화)되었습니다.');
      setDeleteTarget(null);
      fetchUsers();
    } catch (err: any) {
      message.error(err?.response?.data?.message ?? '삭제에 실패했습니다.');
    }
  }, [deleteTarget, fetchUsers]);

  /* ── Password reset ─── */
  const handleResetPassword = useCallback(async () => {
    if (!resetTarget) return;
    try {
      await apiClient.post(`/v1/users/${resetTarget.user_id}/reset-password`);
      message.success(`${resetTarget.user_nm}님의 비밀번호가 초기화되었습니다.`);
      setResetTarget(null);
    } catch (err: any) {
      message.error(err?.response?.data?.message ?? '비밀번호 초기화에 실패했습니다.');
    }
  }, [resetTarget]);

  /* ── Login ID duplicate check helper ─── */
  const checkDuplicateLoginId = useCallback(
    async (_: unknown, value: string) => {
      if (!value || value.length < 2) return;
      // Skip check in edit mode
      if (modalMode === 'edit') return;
      try {
        const res = await apiClient.get<ApiResponse<UserRow[]>>('/v1/users', {
          params: { login_id: value, limit: 1 },
        });
        const data = res.data.data;
        const items = Array.isArray(data) ? data : (data as any)?.data ?? [];
        if (items.length > 0 && items[0].login_id === value) {
          throw new Error('이미 사용 중인 로그인 ID입니다.');
        }
      } catch (err: any) {
        if (err.message === '이미 사용 중인 로그인 ID입니다.') {
          return Promise.reject(err.message);
        }
        // API error → skip validation (server will catch on submit)
      }
    },
    [modalMode],
  );

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
    <div style={{ padding: 0 }}>
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
            type="primary"
            icon={<PlusOutlined />}
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
            <Form.Item
              name="login_id"
              label="로그인ID"
              rules={[
                { required: true, message: '로그인ID를 입력하세요.' },
                { min: 2, message: '2자 이상 입력하세요.' },
                ...(mode === 'create'
                  ? [{ validator: checkDuplicateLoginId }]
                  : []),
              ]}
            >
              <Input
                placeholder="로그인ID"
                disabled={mode === 'edit'}
                maxLength={50}
              />
            </Form.Item>

            <Form.Item
              name="user_nm"
              label="성명"
              rules={[{ required: true, message: '성명을 입력하세요.' }]}
            >
              <Input placeholder="성명" maxLength={50} />
            </Form.Item>

            {mode === 'create' && (
              <Form.Item
                name="password"
                label="비밀번호"
                rules={[
                  { required: true, message: '비밀번호를 입력하세요.' },
                  { min: 6, message: '6자 이상 입력하세요.' },
                ]}
              >
                <Input.Password placeholder="비밀번호 (6자 이상)" />
              </Form.Item>
            )}

            <Form.Item name="role_cd" label="역할">
              <Select
                placeholder="역할 선택"
                allowClear
                showSearch
                optionFilterProp="label"
                options={roleOptions.map((r) => ({
                  label: r.role_nm,
                  value: r.role_cd,
                }))}
              />
            </Form.Item>

            {mode === 'edit' && (
              <Form.Item name="status" label="상태">
                <Select
                  options={[
                    { label: '활성', value: 'ACTIVE' },
                    { label: '비활성', value: 'INACTIVE' },
                  ]}
                />
              </Form.Item>
            )}
          </>
        )}
      </FormModal>

      {/* 삭제 확인 모달 */}
      <Modal
        open={!!deleteTarget}
        title="사용자 삭제"
        onOk={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        okText="삭제"
        cancelText="취소"
        okButtonProps={{ danger: true }}
      >
        <p>
          <strong>{deleteTarget?.user_nm}</strong> ({deleteTarget?.login_id})
          님을 삭제(비활성화)하시겠습니까?
        </p>
        <p style={{ color: '#999', fontSize: 13 }}>
          ※ 논리 삭제로 상태가 비활성으로 변경됩니다.
        </p>
      </Modal>

      {/* 비밀번호 초기화 확인 모달 */}
      <Modal
        open={!!resetTarget}
        title="비밀번호 초기화"
        onOk={handleResetPassword}
        onCancel={() => setResetTarget(null)}
        okText="초기화"
        cancelText="취소"
      >
        <p>
          <strong>{resetTarget?.user_nm}</strong> ({resetTarget?.login_id})
          님의 비밀번호를 초기화하시겠습니까?
        </p>
        <p style={{ color: '#999', fontSize: 13 }}>
          ※ 기본 비밀번호(foodly1234!)로 초기화됩니다.
        </p>
      </Modal>
    </div>
  );
}
