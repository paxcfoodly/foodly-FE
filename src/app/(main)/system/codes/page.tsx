'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Button,
  Space,
  Tag,
  Modal,
  Form,
  Input,
  InputNumber,
  Select,
  Card,
  Table,
  message,
  Spin,
  Popconfirm,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
} from '@ant-design/icons';
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
      message.error(err?.response?.data?.message ?? '코드그룹 목록 조회에 실패했습니다.');
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
      message.error(err?.response?.data?.message ?? '코드 목록 조회에 실패했습니다.');
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
      message.success('코드그룹이 삭제되었습니다.');
      setDeleteGroupTarget(null);
      if (selectedGroupCd === deleteGroupTarget.group_cd) {
        setSelectedGroupCd(null);
        setCodes([]);
      }
      fetchGroups();
    } catch (err: any) {
      message.error(err?.response?.data?.message ?? '삭제에 실패했습니다.');
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
        message.success('코드가 삭제되었습니다.');
        fetchCodes(selectedGroupCd);
        fetchGroups();
      } catch (err: any) {
        message.error(err?.response?.data?.message ?? '삭제에 실패했습니다.');
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
          <Tag color={(val as string) === 'Y' ? 'green' : 'default'}>
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
          <Space size={4}>
            <PermissionButton
              action="update"
              menuUrl={MENU_URL}
              fallback="hide"
              size="small"
              type="text"
              icon={<EditOutlined />}
              onClick={() => handleCodeEdit(record)}
            >
              {''}
            </PermissionButton>
            <Popconfirm
              title="코드를 삭제하시겠습니까?"
              onConfirm={() => handleCodeDelete(record)}
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
          </Space>
        ),
      },
    ],
    [handleCodeEdit, handleCodeDelete],
  );

  /* ── Render ─── */
  return (
    <div style={{ display: 'flex', gap: 16, height: '100%' }}>
      {/* 좌측: 그룹코드 목록 */}
      <Card
        title="코드그룹"
        style={{ width: 340, flexShrink: 0 }}
        bodyStyle={{ padding: 0 }}
        extra={
          <PermissionButton
            action="create"
            menuUrl={MENU_URL}
            type="primary"
            size="small"
            icon={<PlusOutlined />}
            onClick={handleGroupCreate}
          >
            그룹 등록
          </PermissionButton>
        }
      >
        <Spin spinning={groupLoading}>
          <div style={{ maxHeight: 'calc(100vh - 260px)', overflowY: 'auto' }}>
            {groups.map((group) => (
              <div
                key={group.group_cd}
                onClick={() => setSelectedGroupCd(group.group_cd)}
                style={{
                  padding: '12px 16px',
                  cursor: 'pointer',
                  borderBottom: '1px solid #f0f0f0',
                  backgroundColor: selectedGroupCd === group.group_cd ? '#e6f4ff' : undefined,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <div style={{ fontWeight: 500 }}>{group.group_nm}</div>
                  <div style={{ fontSize: 12, color: '#999' }}>
                    {group.group_cd}
                    {group._count && (
                      <span style={{ marginLeft: 8 }}>코드 {group._count.codes}개</span>
                    )}
                  </div>
                </div>
                <Space size={4}>
                  <Tag color={group.use_yn === 'Y' ? 'green' : 'default'}>
                    {group.use_yn === 'Y' ? '사용' : '미사용'}
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
                    type="text"
                    danger
                    icon={<DeleteOutlined />}
                    onClick={(e) => {
                      e?.stopPropagation();
                      setDeleteGroupTarget(group);
                    }}
                  >
                    {''}
                  </PermissionButton>
                </Space>
              </div>
            ))}
            {groups.length === 0 && !groupLoading && (
              <div style={{ padding: 24, textAlign: 'center', color: '#999' }}>
                등록된 코드그룹이 없습니다.
              </div>
            )}
          </div>
        </Spin>
      </Card>

      {/* 우측: 상세코드 */}
      <Card
        title={
          selectedGroupCd
            ? `${groups.find((g) => g.group_cd === selectedGroupCd)?.group_nm ?? selectedGroupCd} 상세코드`
            : '상세코드'
        }
        style={{ flex: 1, minWidth: 0 }}
        extra={
          selectedGroupCd && (
            <PermissionButton
              action="create"
              menuUrl={MENU_URL}
              type="primary"
              size="small"
              icon={<PlusOutlined />}
              onClick={handleCodeCreate}
            >
              코드 등록
            </PermissionButton>
          )
        }
      >
        {!selectedGroupCd ? (
          <div style={{ textAlign: 'center', padding: 48, color: '#999' }}>
            좌측에서 코드그룹을 선택해주세요.
          </div>
        ) : (
          <Table
            columns={codeColumns}
            dataSource={codes}
            rowKey="code"
            loading={codeLoading}
            pagination={false}
            scroll={{ y: 'calc(100vh - 340px)' }}
            size="small"
          />
        )}
      </Card>

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
          <>
            <Form.Item
              name="group_cd"
              label="그룹코드"
              rules={[
                { required: true, message: '그룹코드를 입력하세요.' },
                { pattern: /^[A-Z_]+$/, message: '영문 대문자와 _만 사용 가능합니다.' },
              ]}
            >
              <Input
                placeholder="예: ITEM_TYPE"
                disabled={mode === 'edit'}
                maxLength={30}
              />
            </Form.Item>
            <Form.Item
              name="group_nm"
              label="그룹명"
              rules={[{ required: true, message: '그룹명을 입력하세요.' }]}
            >
              <Input placeholder="그룹명" maxLength={50} />
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
          <>
            <Form.Item
              name="code"
              label="코드"
              rules={[{ required: true, message: '코드를 입력하세요.' }]}
            >
              <Input
                placeholder="코드값"
                disabled={mode === 'edit'}
                maxLength={30}
              />
            </Form.Item>
            <Form.Item
              name="code_nm"
              label="코드명"
              rules={[{ required: true, message: '코드명을 입력하세요.' }]}
            >
              <Input placeholder="코드명" maxLength={50} />
            </Form.Item>
            <Form.Item name="sort_order" label="정렬순서">
              <InputNumber placeholder="0" min={0} max={999} style={{ width: '100%' }} />
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

      {/* 그룹 삭제 확인 모달 */}
      <Modal
        open={!!deleteGroupTarget}
        title="코드그룹 삭제"
        onOk={handleGroupDelete}
        onCancel={() => setDeleteGroupTarget(null)}
        okText="삭제"
        cancelText="취소"
        okButtonProps={{ danger: true }}
      >
        <p>
          <strong>{deleteGroupTarget?.group_nm}</strong> ({deleteGroupTarget?.group_cd}) 코드그룹을 삭제하시겠습니까?
        </p>
        {deleteGroupTarget?._count && deleteGroupTarget._count.codes > 0 && (
          <p style={{ color: '#ff4d4f', fontSize: 13 }}>
            ※ 하위 코드가 {deleteGroupTarget._count.codes}개 존재하여 삭제가 거부될 수 있습니다.
          </p>
        )}
      </Modal>
    </div>
  );
}
