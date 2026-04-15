'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import Tag from '@/components/ui/Tag';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import { Section, Row } from '@/components/ui/Section';
import Spinner from '@/components/ui/Spinner';
import Table from '@/components/ui/Table';
import toast from '@/components/ui/toast';
import { confirm } from '@/components/ui/confirm';
import PermissionButton from '@/components/auth/PermissionButton';
import FormModal, { type FormModalMode } from '@/components/common/FormModal';
import apiClient from '@/lib/apiClient';
import type { ApiResponse } from '@/types';

/* ── Types ─────────────────────────────────────────── */

interface CodeGroupRow {
  group_cd: string;
  group_nm: string;
  use_yn: string;
  create_dt: string;
  _count?: { codes: number };
  [key: string]: unknown;
}

interface CodeDetailRow {
  group_cd: string;
  code: string;
  code_nm: string;
  sort_order: number;
  use_yn: string;
  create_dt: string;
  [key: string]: unknown;
}

interface GroupFormValues {
  group_cd: string;
  group_nm: string;
  use_yn?: string;
  [key: string]: unknown;
}

interface CodeFormValues {
  code: string;
  code_nm: string;
  sort_order?: number;
  use_yn?: string;
  [key: string]: unknown;
}

const MENU_URL = '/system/codes';

/* ── Component ─────────────────────────────────────── */

export default function CommonCodesPage() {
  /* ── Group State ─── */
  const [groups, setGroups] = useState<CodeGroupRow[]>([]);
  const [groupLoading, setGroupLoading] = useState(false);
  const [selectedGroupCd, setSelectedGroupCd] = useState<string | null>(null);

  // Group modal
  const [groupModalOpen, setGroupModalOpen] = useState(false);
  const [groupModalMode, setGroupModalMode] = useState<FormModalMode>('create');
  const [editGroup, setEditGroup] = useState<CodeGroupRow | null>(null);
  const [deleteGroupTarget, setDeleteGroupTarget] = useState<CodeGroupRow | null>(null);

  /* ── Code State ─── */
  const [codes, setCodes] = useState<CodeDetailRow[]>([]);
  const [codeLoading, setCodeLoading] = useState(false);

  // Code modal
  const [codeModalOpen, setCodeModalOpen] = useState(false);
  const [codeModalMode, setCodeModalMode] = useState<FormModalMode>('create');
  const [editCode, setEditCode] = useState<CodeDetailRow | null>(null);

  /* ── Fetch groups ─── */
  const fetchGroups = useCallback(async () => {
    setGroupLoading(true);
    try {
      const res = await apiClient.get<ApiResponse<CodeGroupRow[]>>('/v1/common-codes-admin');
      const data = res.data.data;
      setGroups(Array.isArray(data) ? data : []);
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? '코드그룹 목록 조회에 실패했습니다.');
    } finally {
      setGroupLoading(false);
    }
  }, []);

  /* ── Fetch codes for selected group ─── */
  const fetchCodes = useCallback(async (groupCd: string) => {
    setCodeLoading(true);
    try {
      const res = await apiClient.get<ApiResponse<{ codes: CodeDetailRow[] } & CodeGroupRow>>(
        `/v1/common-codes-admin/${groupCd}`,
      );
      const data = res.data.data;
      const codeList = (data as any).codes ?? [];
      setCodes(Array.isArray(codeList) ? codeList : []);
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? '코드 목록 조회에 실패했습니다.');
      setCodes([]);
    } finally {
      setCodeLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  useEffect(() => {
    if (selectedGroupCd) {
      fetchCodes(selectedGroupCd);
    } else {
      setCodes([]);
    }
  }, [selectedGroupCd, fetchCodes]);

  /* ── Group handlers ─── */
  const handleGroupCreate = useCallback(() => {
    setEditGroup(null);
    setGroupModalMode('create');
    setGroupModalOpen(true);
  }, []);

  const handleGroupEdit = useCallback((record: CodeGroupRow) => {
    setEditGroup(record);
    setGroupModalMode('edit');
    setGroupModalOpen(true);
  }, []);

  const handleGroupSubmit = useCallback(
    async (values: GroupFormValues, mode: FormModalMode) => {
      if (mode === 'create') {
        await apiClient.post('/v1/common-codes-admin', {
          group_cd: values.group_cd,
          group_nm: values.group_nm,
        });
      } else {
        await apiClient.put(`/v1/common-codes-admin/${editGroup!.group_cd}`, {
          group_nm: values.group_nm,
          use_yn: values.use_yn,
        });
      }
      fetchGroups();
    },
    [editGroup, fetchGroups],
  );

  const handleGroupDelete = useCallback(async () => {
    if (!deleteGroupTarget) return;
    try {
      await apiClient.delete(`/v1/common-codes-admin/${deleteGroupTarget.group_cd}`);
      toast.success('코드그룹이 삭제되었습니다.');
      setDeleteGroupTarget(null);
      if (selectedGroupCd === deleteGroupTarget.group_cd) {
        setSelectedGroupCd(null);
        setCodes([]);
      }
      fetchGroups();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? '삭제에 실패했습니다.');
    }
  }, [deleteGroupTarget, selectedGroupCd, fetchGroups]);

  const groupInitialValues = useMemo(() => {
    if (!editGroup) return undefined;
    return {
      group_cd: editGroup.group_cd,
      group_nm: editGroup.group_nm,
      use_yn: editGroup.use_yn,
    } as Partial<GroupFormValues>;
  }, [editGroup]);

  /* ── Code handlers ─── */
  const handleCodeCreate = useCallback(() => {
    setEditCode(null);
    setCodeModalMode('create');
    setCodeModalOpen(true);
  }, []);

  const handleCodeEdit = useCallback((record: CodeDetailRow) => {
    setEditCode(record);
    setCodeModalMode('edit');
    setCodeModalOpen(true);
  }, []);

  const handleCodeSubmit = useCallback(
    async (values: CodeFormValues, mode: FormModalMode) => {
      if (!selectedGroupCd) return;
      if (mode === 'create') {
        await apiClient.post(`/v1/common-codes-admin/${selectedGroupCd}/codes`, {
          code: values.code,
          code_nm: values.code_nm,
          sort_order: values.sort_order ?? 0,
        });
      } else {
        await apiClient.put(
          `/v1/common-codes-admin/${selectedGroupCd}/codes/${editCode!.code}`,
          {
            code_nm: values.code_nm,
            sort_order: values.sort_order,
            use_yn: values.use_yn,
          },
        );
      }
      fetchCodes(selectedGroupCd);
      fetchGroups(); // Update counts
    },
    [selectedGroupCd, editCode, fetchCodes, fetchGroups],
  );

  const handleCodeDelete = useCallback(
    async (record: CodeDetailRow) => {
      if (!selectedGroupCd) return;
      try {
        await apiClient.delete(
          `/v1/common-codes-admin/${selectedGroupCd}/codes/${record.code}`,
        );
        toast.success('코드가 삭제되었습니다.');
        fetchCodes(selectedGroupCd);
        fetchGroups();
      } catch (err: any) {
        toast.error(err?.response?.data?.message ?? '삭제에 실패했습니다.');
      }
    },
    [selectedGroupCd, fetchCodes, fetchGroups],
  );

  const codeInitialValues = useMemo(() => {
    if (!editCode) return undefined;
    return {
      code: editCode.code,
      code_nm: editCode.code_nm,
      sort_order: editCode.sort_order,
      use_yn: editCode.use_yn,
    } as Partial<CodeFormValues>;
  }, [editCode]);

  /* ── Code table columns ─── */
  const codeColumns = useMemo(
    () => [
      { title: '코드', dataIndex: 'code', width: 120 },
      { title: '코드명', dataIndex: 'code_nm', width: 200 },
      { title: '정렬', dataIndex: 'sort_order', width: 70, align: 'center' as const },
      {
        title: '사용',
        dataIndex: 'use_yn',
        width: 70,
        align: 'center' as const,
        render: (val: unknown) => (
          <Tag color={(val as string) === 'Y' ? 'green' : 'gray'}>
            {(val as string) === 'Y' ? 'Y' : 'N'}
          </Tag>
        ),
      },
      {
        title: '관리',
        dataIndex: '_action',
        width: 120,
        align: 'center' as const,
        render: (_: unknown, record: CodeDetailRow) => (
          <div className="flex items-center gap-1 justify-center">
            <PermissionButton
              action="update"
              menuUrl={MENU_URL}
              fallback="hide"
              size="small"
              variant="ghost"
              icon={<Pencil className="w-4 h-4" />}
              onClick={() => handleCodeEdit(record)}
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
              onClick={() => {
                confirm({
                  title: '코드 삭제',
                  content: '코드를 삭제하시겠습니까?',
                  okText: '삭제',
                  danger: true,
                  onOk: () => handleCodeDelete(record),
                });
              }}
            >
              {''}
            </PermissionButton>
          </div>
        ),
      },
    ],
    [handleCodeEdit, handleCodeDelete],
  );

  /* ── Render ─── */
  return (
    <div className="flex gap-4 h-full">
      {/* 좌측: 그룹코드 목록 */}
      <div className="w-[340px] shrink-0 bg-white rounded-xl shadow-sm">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="text-base font-semibold text-gray-900">코드그룹</h3>
          <PermissionButton
            action="create"
            menuUrl={MENU_URL}
            variant="primary"
            size="small"
            icon={<Plus className="w-4 h-4" />}
            onClick={handleGroupCreate}
          >
            그룹 등록
          </PermissionButton>
        </div>
        <Spinner spinning={groupLoading}>
          <div className="max-h-[calc(100vh-260px)] overflow-y-auto">
            {groups.map((group) => (
              <div
                key={group.group_cd}
                onClick={() => setSelectedGroupCd(group.group_cd)}
                className={`px-4 py-3 cursor-pointer border-b border-gray-50 flex justify-between items-center hover:bg-gray-50 ${
                  selectedGroupCd === group.group_cd ? 'bg-blue-50' : ''
                }`}
              >
                <div>
                  <div className="font-medium">{group.group_nm}</div>
                  <div className="text-xs text-gray-400">
                    {group.group_cd}
                    {group._count && (
                      <span className="ml-2">코드 {group._count.codes}개</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Tag color={group.use_yn === 'Y' ? 'green' : 'gray'}>
                    {group.use_yn === 'Y' ? '사용' : '미사용'}
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
                      handleGroupEdit(group);
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
                      setDeleteGroupTarget(group);
                    }}
                  >
                    {''}
                  </PermissionButton>
                </div>
              </div>
            ))}
            {groups.length === 0 && !groupLoading && (
              <div className="p-6 text-center text-gray-400">
                등록된 코드그룹이 없습니다.
              </div>
            )}
          </div>
        </Spinner>
      </div>

      {/* 우측: 상세코드 */}
      <div className="flex-1 min-w-0 bg-white rounded-xl shadow-sm">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="text-base font-semibold text-gray-900">
            {selectedGroupCd
              ? `${groups.find((g) => g.group_cd === selectedGroupCd)?.group_nm ?? selectedGroupCd} 상세코드`
              : '상세코드'}
          </h3>
          {selectedGroupCd && (
            <PermissionButton
              action="create"
              menuUrl={MENU_URL}
              variant="primary"
              size="small"
              icon={<Plus className="w-4 h-4" />}
              onClick={handleCodeCreate}
            >
              코드 등록
            </PermissionButton>
          )}
        </div>
        <div className="p-6">
          {!selectedGroupCd ? (
            <div className="text-center py-12 text-gray-400">
              좌측에서 코드그룹을 선택해주세요.
            </div>
          ) : (
            <Table
              columns={codeColumns}
              dataSource={codes}
              rowKey="code"
              loading={codeLoading}
            />
          )}
        </div>
      </div>

      {/* 그룹 등록/수정 모달 */}
      <FormModal<GroupFormValues>
        open={groupModalOpen}
        onClose={() => {
          setGroupModalOpen(false);
          setEditGroup(null);
        }}
        onSubmit={handleGroupSubmit}
        mode={groupModalMode}
        initialValues={groupInitialValues}
        title={groupModalMode === 'create' ? '코드그룹 등록' : '코드그룹 수정'}
        width={440}
      >
        {(form, mode) => (
          <Section title="코드그룹 정보">
            <Row label="그룹코드" required>
              <Input
                name="group_cd"
                placeholder="예: ITEM_TYPE"
                disabled={mode === 'edit'}
                maxLength={30}
                required
                pattern="^[A-Z_]+$"
                title="영문 대문자와 _만 사용 가능합니다."
                value={(form.getFieldsValue().group_cd as string) ?? ''}
                onChange={(e) => form.setFieldsValue({ group_cd: e.target.value } as Partial<GroupFormValues>)}
              />
            </Row>
            <Row label="그룹명" required>
              <Input
                name="group_nm"
                placeholder="그룹명"
                maxLength={50}
                required
                value={(form.getFieldsValue().group_nm as string) ?? ''}
                onChange={(e) => form.setFieldsValue({ group_nm: e.target.value } as Partial<GroupFormValues>)}
              />
            </Row>
            {mode === 'edit' && (
              <Row label="사용여부">
                <Select
                  name="use_yn"
                  value={(form.getFieldsValue().use_yn as string) ?? ''}
                  onChange={(e) => form.setFieldsValue({ use_yn: e.target.value } as Partial<GroupFormValues>)}
                  options={[
                    { label: '사용', value: 'Y' },
                    { label: '미사용', value: 'N' },
                  ]}
                />
              </Row>
            )}
          </Section>
        )}
      </FormModal>

      {/* 코드 등록/수정 모달 */}
      <FormModal<CodeFormValues>
        open={codeModalOpen}
        onClose={() => {
          setCodeModalOpen(false);
          setEditCode(null);
        }}
        onSubmit={handleCodeSubmit}
        mode={codeModalMode}
        initialValues={codeInitialValues}
        title={codeModalMode === 'create' ? '코드 등록' : '코드 수정'}
        width={440}
      >
        {(form, mode) => (
          <Section title="코드 정보">
            <Row label="코드" required>
              <Input
                name="code"
                placeholder="코드값"
                disabled={mode === 'edit'}
                maxLength={30}
                required
                value={(form.getFieldsValue().code as string) ?? ''}
                onChange={(e) => form.setFieldsValue({ code: e.target.value } as Partial<CodeFormValues>)}
              />
            </Row>
            <Row label="코드명" required>
              <Input
                name="code_nm"
                placeholder="코드명"
                maxLength={50}
                required
                value={(form.getFieldsValue().code_nm as string) ?? ''}
                onChange={(e) => form.setFieldsValue({ code_nm: e.target.value } as Partial<CodeFormValues>)}
              />
            </Row>
            <Row label="정렬순서">
              <input
                type="number"
                name="sort_order"
                placeholder="0"
                min={0}
                max={999}
                className="w-full h-9 bg-dark-700 border border-dark-500 rounded-lg px-3 text-sm text-gray-700 placeholder-gray-400 transition-all focus:outline-none focus:bg-white focus:border-cyan-accent focus:ring-2 focus:ring-cyan-accent/15"
                value={(form.getFieldsValue().sort_order as number) ?? ''}
                onChange={(e) => form.setFieldsValue({ sort_order: e.target.value ? Number(e.target.value) : undefined } as Partial<CodeFormValues>)}
              />
            </Row>
            {mode === 'edit' && (
              <Row label="사용여부">
                <Select
                  name="use_yn"
                  value={(form.getFieldsValue().use_yn as string) ?? ''}
                  onChange={(e) => form.setFieldsValue({ use_yn: e.target.value } as Partial<CodeFormValues>)}
                  options={[
                    { label: '사용', value: 'Y' },
                    { label: '미사용', value: 'N' },
                  ]}
                />
              </Row>
            )}
          </Section>
        )}
      </FormModal>

      {/* 그룹 삭제 확인 모달 */}
      <Modal
        open={!!deleteGroupTarget}
        title="코드그룹 삭제"
        onClose={() => setDeleteGroupTarget(null)}
        footer={
          <div className="flex items-center gap-2">
            <Button onClick={() => setDeleteGroupTarget(null)}>취소</Button>
            <Button variant="danger" onClick={handleGroupDelete}>삭제</Button>
          </div>
        }
      >
        <p>
          <strong>{deleteGroupTarget?.group_nm}</strong> ({deleteGroupTarget?.group_cd}) 코드그룹을 삭제하시겠습니까?
        </p>
        {deleteGroupTarget?._count && deleteGroupTarget._count.codes > 0 && (
          <p className="text-red-500 text-[13px]">
            ※ 하위 코드가 {deleteGroupTarget._count.codes}개 존재하여 삭제가 거부될 수 있습니다.
          </p>
        )}
      </Modal>
    </div>
  );
}
