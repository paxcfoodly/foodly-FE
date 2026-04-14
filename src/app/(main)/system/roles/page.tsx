'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, Pencil, Trash2, Save } from 'lucide-react';
import Tag from '@/components/ui/Tag';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import FormField from '@/components/ui/FormField';
import Spinner from '@/components/ui/Spinner';
import Table from '@/components/ui/Table';
import toast from '@/components/ui/toast';
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
  [key: string]: unknown;
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
      toast.error(err?.response?.data?.message ?? '역할 목록 조회에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  }, []);

  /* ── Fetch menus for permission matrix ─── */
  const fetchMenus = useCallback(async () => {
    try {
      const res = await apiClient.get<ApiResponse<MenuItem[]>>('/v1/common-codes/menus');
      setMenus(Array.isArray(res.data.data) ? res.data.data : []);
    } catch {
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
      toast.error(err?.response?.data?.message ?? '역할 상세 조회에 실패했습니다.');
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
      toast.success('권한이 저장되었습니다.');
      fetchRoleDetail(selectedRoleCd);
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? '권한 저장에 실패했습니다.');
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
      toast.success('역할이 삭제되었습니다.');
      setDeleteTarget(null);
      if (selectedRoleCd === deleteTarget.role_cd) {
        setSelectedRoleCd(null);
        setRoleDetail(null);
        setPermissionMap({});
      }
      fetchRoles();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? '삭제에 실패했습니다.');
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
      },
      ...PERMISSION_KEYS.map((key) => ({
        title: PERMISSION_LABELS[key],
        dataIndex: key,
        width: 80,
        align: 'center' as const,
        render: (_: unknown, record: MenuItem) => (
          <input
            type="checkbox"
            className="accent-cyan-accent w-4 h-4"
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
          return (
            <input
              type="checkbox"
              className="accent-cyan-accent w-4 h-4"
              checked={!!allChecked}
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
    <div className="flex gap-4 h-full">
      {/* 좌측: 역할 목록 */}
      <div className="w-[360px] shrink-0 bg-white rounded-xl shadow-sm">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="text-base font-semibold text-gray-900">역할 목록</h3>
          <PermissionButton
            action="create"
            menuUrl={MENU_URL}
            variant="primary"
            size="small"
            icon={<Plus className="w-4 h-4" />}
            onClick={handleCreate}
          >
            등록
          </PermissionButton>
        </div>
        <Spinner spinning={loading}>
          <div className="max-h-[calc(100vh-260px)] overflow-y-auto">
            {roles.map((role) => (
              <div
                key={role.role_cd}
                onClick={() => setSelectedRoleCd(role.role_cd)}
                className={`px-4 py-3 cursor-pointer border-b border-gray-50 flex justify-between items-center hover:bg-gray-50 ${
                  selectedRoleCd === role.role_cd ? 'bg-blue-50' : ''
                }`}
              >
                <div>
                  <div className="font-medium">{role.role_nm}</div>
                  <div className="text-xs text-gray-400">
                    {role.role_cd}
                    {role._count && (
                      <span className="ml-2">
                        사용자 {role._count.users}명
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Tag color={role.use_yn === 'Y' ? 'green' : 'gray'}>
                    {role.use_yn === 'Y' ? '사용' : '미사용'}
                  </Tag>
                  <PermissionButton
                    action="update"
                    menuUrl={MENU_URL}
                    fallback="hide"
                    size="small"
                    variant="ghost"
                    icon={<Pencil className="w-4 h-4" />}
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
                    variant="danger"
                    icon={<Trash2 className="w-4 h-4" />}
                    onClick={(e) => {
                      e?.stopPropagation();
                      setDeleteTarget(role);
                    }}
                  >
                    {''}
                  </PermissionButton>
                </div>
              </div>
            ))}
            {roles.length === 0 && !loading && (
              <div className="p-6 text-center text-gray-400">
                등록된 역할이 없습니다.
              </div>
            )}
          </div>
        </Spinner>
      </div>

      {/* 우측: 권한 매트릭스 */}
      <div className="flex-1 min-w-0 bg-white rounded-xl shadow-sm">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="text-base font-semibold text-gray-900">
            {selectedRoleCd
              ? `${roleDetail?.role_nm ?? selectedRoleCd} 메뉴 권한 설정`
              : '메뉴 권한 설정'}
          </h3>
          {selectedRoleCd && (
            <PermissionButton
              action="update"
              menuUrl={MENU_URL}
              variant="primary"
              icon={<Save className="w-4 h-4" />}
              loading={saving}
              onClick={handleSavePermissions}
            >
              권한 저장
            </PermissionButton>
          )}
        </div>
        <div className="p-6">
          {!selectedRoleCd ? (
            <div className="text-center py-12 text-gray-400">
              좌측에서 역할을 선택해주세요.
            </div>
          ) : (
            <Table
              columns={matrixColumns}
              dataSource={menus}
              rowKey="menu_id"
              loading={matrixLoading}
              scrollX={700}
            />
          )}
        </div>
      </div>

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
            <FormField label="역할코드" required>
              <Input
                name="role_cd"
                placeholder="예: SYS_ADMIN"
                disabled={mode === 'edit'}
                maxLength={30}
                required
                pattern="^[A-Z_]+$"
                title="영문 대문자와 _만 사용 가능합니다."
                value={(form.getFieldsValue().role_cd as string) ?? ''}
                onChange={(e) => form.setFieldsValue({ role_cd: e.target.value } as Partial<RoleFormValues>)}
              />
            </FormField>

            <FormField label="역할명" required>
              <Input
                name="role_nm"
                placeholder="역할명"
                maxLength={50}
                required
                value={(form.getFieldsValue().role_nm as string) ?? ''}
                onChange={(e) => form.setFieldsValue({ role_nm: e.target.value } as Partial<RoleFormValues>)}
              />
            </FormField>

            <FormField label="설명">
              <Textarea
                name="role_desc"
                placeholder="역할 설명"
                maxLength={200}
                rows={3}
                value={(form.getFieldsValue().role_desc as string) ?? ''}
                onChange={(e) => form.setFieldsValue({ role_desc: e.target.value } as Partial<RoleFormValues>)}
              />
            </FormField>

            {mode === 'edit' && (
              <FormField label="사용여부">
                <Select
                  name="use_yn"
                  value={(form.getFieldsValue().use_yn as string) ?? ''}
                  onChange={(e) => form.setFieldsValue({ use_yn: e.target.value } as Partial<RoleFormValues>)}
                  options={[
                    { label: '사용', value: 'Y' },
                    { label: '미사용', value: 'N' },
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
        title="역할 삭제"
        onClose={() => setDeleteTarget(null)}
        footer={
          <div className="flex items-center gap-2">
            <Button onClick={() => setDeleteTarget(null)}>취소</Button>
            <Button variant="danger" onClick={handleDelete}>삭제</Button>
          </div>
        }
      >
        <p>
          <strong>{deleteTarget?.role_nm}</strong> ({deleteTarget?.role_cd}) 역할을 삭제하시겠습니까?
        </p>
        {deleteTarget?._count && deleteTarget._count.users > 0 && (
          <p className="text-red-500 text-[13px]">
            ※ 해당 역할에 {deleteTarget._count.users}명의 사용자가 배정되어 있어 삭제가 거부될 수 있습니다.
          </p>
        )}
      </Modal>
    </div>
  );
}
