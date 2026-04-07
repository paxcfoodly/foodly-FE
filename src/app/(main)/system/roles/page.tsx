'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Button,
  Space,
  Tag,
  Modal,
  Form,
  Input,
  Select,
  Checkbox,
  Table,
  Card,
  message,
  Spin,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SaveOutlined,
} from '@ant-design/icons';
import PermissionButton from '@/components/auth/PermissionButton';
import FormModal, { type FormModalMode } from '@/components/common/FormModal';
import apiClient from '@/lib/apiClient';
import type { ApiResponse } from '@/types';

/* ── Types ─────────────────────────────────────────── */

interface RoleRow {
  role_cd: string;
  role_nm: string;
  role_desc: string | null;
  use_yn: string;
  create_dt: string;
  _count?: { users: number; role_menus: number };
  [key: string]: unknown;
}

interface RoleFormValues {
  role_cd: string;
  role_nm: string;
  role_desc?: string;
  use_yn?: string;
  [key: string]: unknown;
}

interface MenuPermission {
  menu_id: number;
  can_create: string;
  can_read: string;
  can_update: string;
  can_delete: string;
  can_print: string;
  menu?: { menu_id: number; menu_nm: string; menu_url: string; sort_order: number };
}

interface RoleDetail {
  role_cd: string;
  role_nm: string;
  role_desc: string | null;
  use_yn: string;
  role_menus: MenuPermission[];
}

interface MenuItem {
  menu_id: number;
  menu_nm: string;
  menu_url: string | null;
  parent_menu_id: number | null;
  sort_order: number;
  depth: number;
  use_yn: string;
}

const MENU_URL = '/system/roles';
const PERMISSION_KEYS = ['can_read', 'can_create', 'can_update', 'can_delete', 'can_print'] as const;
const PERMISSION_LABELS: Record<string, string> = {
  can_read: '조회',
  can_create: '등록',
  can_update: '수정',
  can_delete: '삭제',
  can_print: '출력',
};

/* ── Component ─────────────────────────────────────── */

export default function RolesPage() {
  /* ── State ─── */
  const [roles, setRoles] = useState<RoleRow[]>([]);
  const [loading, setLoading] = useState(false);

  // Selected role for permission matrix
  const [selectedRoleCd, setSelectedRoleCd] = useState<string | null>(null);
  const [roleDetail, setRoleDetail] = useState<RoleDetail | null>(null);
  const [menus, setMenus] = useState<MenuItem[]>([]);
  const [permissionMap, setPermissionMap] = useState<Record<number, Record<string, boolean>>>({});
  const [matrixLoading, setMatrixLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<FormModalMode>('create');
  const [editRecord, setEditRecord] = useState<RoleRow | null>(null);

  // Delete confirm
  const [deleteTarget, setDeleteTarget] = useState<RoleRow | null>(null);

  /* ── Fetch roles ─── */
  const fetchRoles = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get<ApiResponse<RoleRow[]>>('/v1/roles');
      const data = res.data.data;
      setRoles(Array.isArray(data) ? data : []);
    } catch (err: any) {
      message.error(err?.response?.data?.message ?? '역할 목록 조회에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  }, []);

  /* ── Fetch menus for permission matrix ─── */
  const fetchMenus = useCallback(async () => {
    try {
      // Get menus from a generic endpoint; if it doesn't exist, we'll grab from roles detail
      const res = await apiClient.get<ApiResponse<MenuItem[]>>('/v1/common-codes/menus');
      setMenus(Array.isArray(res.data.data) ? res.data.data : []);
    } catch {
      // Fallback: fetch all menus from Prisma via a custom admin endpoint
      // For now, menus will be populated from role detail
      setMenus([]);
    }
  }, []);

  /* ── Fetch role detail with permissions ─── */
  const fetchRoleDetail = useCallback(async (roleCd: string) => {
    setMatrixLoading(true);
    try {
      const res = await apiClient.get<ApiResponse<RoleDetail>>(`/v1/roles/${roleCd}`);
      const detail = res.data.data;
      setRoleDetail(detail);

      // Build permission map from role_menus
      const map: Record<number, Record<string, boolean>> = {};
      if (detail.role_menus) {
        for (const rm of detail.role_menus) {
          map[rm.menu_id] = {
            can_read: rm.can_read === 'Y',
            can_create: rm.can_create === 'Y',
            can_update: rm.can_update === 'Y',
            can_delete: rm.can_delete === 'Y',
            can_print: rm.can_print === 'Y',
          };
        }
      }
      setPermissionMap(map);

      // If we have menus from role_menus, extract menu info
      if (menus.length === 0 && detail.role_menus?.length > 0) {
        const menuList = detail.role_menus
          .filter((rm) => rm.menu)
          .map((rm) => ({
            menu_id: rm.menu!.menu_id,
            menu_nm: rm.menu!.menu_nm,
            menu_url: rm.menu!.menu_url,
            parent_menu_id: null,
            sort_order: rm.menu!.sort_order,
            depth: 0,
            use_yn: 'Y',
          }));
        if (menuList.length > 0) setMenus(menuList);
      }
    } catch (err: any) {
      message.error(err?.response?.data?.message ?? '역할 상세 조회에 실패했습니다.');
    } finally {
      setMatrixLoading(false);
    }
  }, [menus.length]);

  useEffect(() => {
    fetchRoles();
    fetchMenus();
  }, [fetchRoles, fetchMenus]);

  useEffect(() => {
    if (selectedRoleCd) {
      fetchRoleDetail(selectedRoleCd);
    }
  }, [selectedRoleCd, fetchRoleDetail]);

  /* ── Permission toggle ─── */
  const handlePermissionToggle = useCallback(
    (menuId: number, key: string, checked: boolean) => {
      setPermissionMap((prev) => ({
        ...prev,
        [menuId]: {
          ...prev[menuId],
          [key]: checked,
        },
      }));
    },
    [],
  );

  /* ── Row-level toggle all ─── */
  const handleRowToggleAll = useCallback(
    (menuId: number, checked: boolean) => {
      setPermissionMap((prev) => ({
        ...prev,
        [menuId]: PERMISSION_KEYS.reduce(
          (acc, key) => ({ ...acc, [key]: checked }),
          {} as Record<string, boolean>,
        ),
      }));
    },
    [],
  );

  /* ── Save permissions ─── */
  const handleSavePermissions = useCallback(async () => {
    if (!selectedRoleCd) return;
    setSaving(true);
    try {
      const permissions = Object.entries(permissionMap)
        .filter(([, perms]) => Object.values(perms).some(Boolean))
        .map(([menuIdStr, perms]) => ({
          menu_id: Number(menuIdStr),
          can_create: perms.can_create ? 'Y' : 'N',
          can_read: perms.can_read ? 'Y' : 'N',
          can_update: perms.can_update ? 'Y' : 'N',
          can_delete: perms.can_delete ? 'Y' : 'N',
          can_print: perms.can_print ? 'Y' : 'N',
        }));

      await apiClient.put(`/v1/roles/${selectedRoleCd}/permissions`, { permissions });
      message.success('권한이 저장되었습니다.');
      fetchRoleDetail(selectedRoleCd);
    } catch (err: any) {
      message.error(err?.response?.data?.message ?? '권한 저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  }, [selectedRoleCd, permissionMap, fetchRoleDetail]);

  /* ── Role CRUD handlers ─── */
  const handleCreate = useCallback(() => {
    setEditRecord(null);
    setModalMode('create');
    setModalOpen(true);
  }, []);

  const handleEdit = useCallback((record: RoleRow) => {
    setEditRecord(record);
    setModalMode('edit');
    setModalOpen(true);
  }, []);

  const handleModalClose = useCallback(() => {
    setModalOpen(false);
    setEditRecord(null);
  }, []);

  const handleSubmit = useCallback(
    async (values: RoleFormValues, mode: FormModalMode) => {
      if (mode === 'create') {
        await apiClient.post('/v1/roles', {
          role_cd: values.role_cd,
          role_nm: values.role_nm,
          role_desc: values.role_desc || null,
        });
      } else {
        await apiClient.put(`/v1/roles/${editRecord!.role_cd}`, {
          role_nm: values.role_nm,
          role_desc: values.role_desc || null,
          use_yn: values.use_yn,
        });
      }
      fetchRoles();
    },
    [editRecord, fetchRoles],
  );

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    try {
      await apiClient.delete(`/v1/roles/${deleteTarget.role_cd}`);
      message.success('역할이 삭제되었습니다.');
      setDeleteTarget(null);
      if (selectedRoleCd === deleteTarget.role_cd) {
        setSelectedRoleCd(null);
        setRoleDetail(null);
        setPermissionMap({});
      }
      fetchRoles();
    } catch (err: any) {
      message.error(err?.response?.data?.message ?? '삭제에 실패했습니다.');
    }
  }, [deleteTarget, selectedRoleCd, fetchRoles]);

  /* ── Form initial values ─── */
  const formInitialValues = useMemo(() => {
    if (!editRecord) return undefined;
    return {
      role_cd: editRecord.role_cd,
      role_nm: editRecord.role_nm,
      role_desc: editRecord.role_desc ?? '',
      use_yn: editRecord.use_yn,
    } as Partial<RoleFormValues>;
  }, [editRecord]);

  /* ── Permission matrix columns ─── */
  const matrixColumns = useMemo(
    () => [
      {
        title: '메뉴',
        dataIndex: 'menu_nm',
        width: 200,
        fixed: 'left' as const,
      },
      ...PERMISSION_KEYS.map((key) => ({
        title: PERMISSION_LABELS[key],
        dataIndex: key,
        width: 80,
        align: 'center' as const,
        render: (_: unknown, record: MenuItem) => (
          <Checkbox
            checked={permissionMap[record.menu_id]?.[key] ?? false}
            onChange={(e) => handlePermissionToggle(record.menu_id, key, e.target.checked)}
          />
        ),
      })),
      {
        title: '전체',
        dataIndex: '_all',
        width: 80,
        align: 'center' as const,
        render: (_: unknown, record: MenuItem) => {
          const perms = permissionMap[record.menu_id];
          const allChecked = perms && PERMISSION_KEYS.every((k) => perms[k]);
          const someChecked = perms && PERMISSION_KEYS.some((k) => perms[k]);
          return (
            <Checkbox
              checked={!!allChecked}
              indeterminate={someChecked && !allChecked}
              onChange={(e) => handleRowToggleAll(record.menu_id, e.target.checked)}
            />
          );
        },
      },
    ],
    [permissionMap, handlePermissionToggle, handleRowToggleAll],
  );

  /* ── Render ─── */
  return (
    <div style={{ display: 'flex', gap: 16, height: '100%' }}>
      {/* 좌측: 역할 목록 */}
      <Card
        title="역할 목록"
        style={{ width: 360, flexShrink: 0 }}
        bodyStyle={{ padding: 0 }}
        extra={
          <PermissionButton
            action="create"
            menuUrl={MENU_URL}
            type="primary"
            size="small"
            icon={<PlusOutlined />}
            onClick={handleCreate}
          >
            등록
          </PermissionButton>
        }
      >
        <Spin spinning={loading}>
          <div style={{ maxHeight: 'calc(100vh - 260px)', overflowY: 'auto' }}>
            {roles.map((role) => (
              <div
                key={role.role_cd}
                onClick={() => setSelectedRoleCd(role.role_cd)}
                style={{
                  padding: '12px 16px',
                  cursor: 'pointer',
                  borderBottom: '1px solid #f0f0f0',
                  backgroundColor: selectedRoleCd === role.role_cd ? '#e6f4ff' : undefined,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <div style={{ fontWeight: 500 }}>{role.role_nm}</div>
                  <div style={{ fontSize: 12, color: '#999' }}>
                    {role.role_cd}
                    {role._count && (
                      <span style={{ marginLeft: 8 }}>
                        사용자 {role._count.users}명
                      </span>
                    )}
                  </div>
                </div>
                <Space size={4}>
                  <Tag color={role.use_yn === 'Y' ? 'green' : 'default'}>
                    {role.use_yn === 'Y' ? '사용' : '미사용'}
                  </Tag>
                  <PermissionButton
                    action="update"
                    menuUrl={MENU_URL}
                    fallback="hide"
                    size="small"
                    type="text"
                    icon={<EditOutlined />}
                    onClick={(e) => {
                      e?.stopPropagation();
                      handleEdit(role);
                    }}
                  >
                    {''}
                  </PermissionButton>
                  <PermissionButton
                    action="delete"
                    menuUrl={MENU_URL}
                    fallback="hide"
                    size="small"
                    type="text"
                    danger
                    icon={<DeleteOutlined />}
                    onClick={(e) => {
                      e?.stopPropagation();
                      setDeleteTarget(role);
                    }}
                  >
                    {''}
                  </PermissionButton>
                </Space>
              </div>
            ))}
            {roles.length === 0 && !loading && (
              <div style={{ padding: 24, textAlign: 'center', color: '#999' }}>
                등록된 역할이 없습니다.
              </div>
            )}
          </div>
        </Spin>
      </Card>

      {/* 우측: 권한 매트릭스 */}
      <Card
        title={
          selectedRoleCd
            ? `${roleDetail?.role_nm ?? selectedRoleCd} 메뉴 권한 설정`
            : '메뉴 권한 설정'
        }
        style={{ flex: 1, minWidth: 0 }}
        extra={
          selectedRoleCd && (
            <PermissionButton
              action="update"
              menuUrl={MENU_URL}
              type="primary"
              icon={<SaveOutlined />}
              loading={saving}
              onClick={handleSavePermissions}
            >
              권한 저장
            </PermissionButton>
          )
        }
      >
        {!selectedRoleCd ? (
          <div style={{ textAlign: 'center', padding: 48, color: '#999' }}>
            좌측에서 역할을 선택해주세요.
          </div>
        ) : (
          <Table
            columns={matrixColumns}
            dataSource={menus}
            rowKey="menu_id"
            loading={matrixLoading}
            pagination={false}
            scroll={{ x: 700, y: 'calc(100vh - 340px)' }}
            size="small"
            bordered
          />
        )}
      </Card>

      {/* 등록/수정 모달 */}
      <FormModal<RoleFormValues>
        open={modalOpen}
        onClose={handleModalClose}
        onSubmit={handleSubmit}
        mode={modalMode}
        initialValues={formInitialValues}
        title={modalMode === 'create' ? '역할 등록' : '역할 수정'}
        width={480}
      >
        {(form, mode) => (
          <>
            <Form.Item
              name="role_cd"
              label="역할코드"
              rules={[
                { required: true, message: '역할코드를 입력하세요.' },
                { pattern: /^[A-Z_]+$/, message: '영문 대문자와 _만 사용 가능합니다.' },
              ]}
            >
              <Input
                placeholder="예: SYS_ADMIN"
                disabled={mode === 'edit'}
                maxLength={30}
              />
            </Form.Item>

            <Form.Item
              name="role_nm"
              label="역할명"
              rules={[{ required: true, message: '역할명을 입력하세요.' }]}
            >
              <Input placeholder="역할명" maxLength={50} />
            </Form.Item>

            <Form.Item name="role_desc" label="설명">
              <Input.TextArea placeholder="역할 설명" maxLength={200} rows={3} />
            </Form.Item>

            {mode === 'edit' && (
              <Form.Item name="use_yn" label="사용여부">
                <Select
                  options={[
                    { label: '사용', value: 'Y' },
                    { label: '미사용', value: 'N' },
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
        title="역할 삭제"
        onOk={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        okText="삭제"
        cancelText="취소"
        okButtonProps={{ danger: true }}
      >
        <p>
          <strong>{deleteTarget?.role_nm}</strong> ({deleteTarget?.role_cd}) 역할을 삭제하시겠습니까?
        </p>
        {deleteTarget?._count && deleteTarget._count.users > 0 && (
          <p style={{ color: '#ff4d4f', fontSize: 13 }}>
            ※ 해당 역할에 {deleteTarget._count.users}명의 사용자가 배정되어 있어 삭제가 거부될 수 있습니다.
          </p>
        )}
      </Modal>
    </div>
  );
}
