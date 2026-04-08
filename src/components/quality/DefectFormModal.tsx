'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
  Modal,
  Form,
  Input,
  InputNumber,
  Select,
  Button,
  Space,
  Tag,
  Table,
  Image,
  message,
  Divider,
} from 'antd';
import type { UploadFile } from 'antd/es/upload';
import type { ColumnsType } from 'antd/es/table';
import { DeleteOutlined } from '@ant-design/icons';
import CommonCodeSelect from '@/components/common/CommonCodeSelect';
import FileUpload from '@/components/common/FileUpload';
import apiClient from '@/lib/apiClient';

/* ── Types ──────────────────────────────────────────── */

interface DisposalRow {
  dispose_id: number;
  dispose_type: string;
  dispose_qty: number;
  approve_by?: string | null;
  approve_dt?: string | null;
  remark?: string | null;
  create_by?: string | null;
  create_dt: string;
  [key: string]: unknown;
}

interface DefectRecord {
  defect_id: number;
  defect_no: string;
  wo_id?: number | null;
  item_cd: string;
  lot_no?: string | null;
  defect_type_cd?: string | null;
  defect_cause_cd?: string | null;
  defect_qty: number;
  status: string;
  process_cd?: string | null;
  remark?: string | null;
  file_id?: number | null;
  item?: { item_nm: string } | null;
  lot?: { lot_status: string } | null;
  work_order?: { wo_no: string } | null;
  disposals?: DisposalRow[];
  [key: string]: unknown;
}

export interface DefectFormModalProps {
  open: boolean;
  mode: 'create' | 'view';
  record?: DefectRecord;
  onClose: () => void;
  onSaved: () => void;
  onDisposeOpen?: (defectId: number) => void;
}

/* ── Status / Disposal Tag helpers ──────────────────── */

const DISPOSE_TYPE_LABEL: Record<string, string> = {
  REWORK: '재작업',
  SCRAP: '폐기',
  CONCESSION: '특채',
};

const DISPOSE_TYPE_COLOR: Record<string, string> = {
  REWORK: 'blue',
  SCRAP: 'error',
  CONCESSION: 'warning',
};

/* ── API base ──────────────────────────────────────── */

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080/api';

/* ── Disposal history columns ────────────────────────── */

const disposalColumns: ColumnsType<DisposalRow> = [
  {
    title: '처리유형',
    dataIndex: 'dispose_type',
    width: 100,
    render: (val: string) => (
      <Tag color={DISPOSE_TYPE_COLOR[val] ?? 'default'}>
        {DISPOSE_TYPE_LABEL[val] ?? val}
      </Tag>
    ),
  },
  {
    title: '처리수량',
    dataIndex: 'dispose_qty',
    width: 90,
    align: 'right',
    render: (val: number) => val?.toLocaleString() ?? '-',
  },
  {
    title: '승인자',
    dataIndex: 'approve_by',
    width: 100,
    render: (val: unknown) => (val as string) || '-',
  },
  {
    title: '처리일시',
    dataIndex: 'create_dt',
    width: 160,
    render: (val: string) => (val ? new Date(val).toLocaleString('ko-KR') : '-'),
  },
];

/* ── Component ──────────────────────────────────────── */

export default function DefectFormModal({
  open,
  mode,
  record,
  onClose,
  onSaved,
  onDisposeOpen,
}: DefectFormModalProps) {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [uploadedFileId, setUploadedFileId] = useState<number | null>(null);

  const isView = mode === 'view';
  const title = isView ? '불량 상세' : '불량 등록';

  /* ── Reset form when modal opens ─── */
  useEffect(() => {
    if (open) {
      if (mode === 'create') {
        form.resetFields();
        setFileList([]);
        setUploadedFileId(null);
      } else if (record) {
        form.setFieldsValue({
          lot_no: record.lot_no ?? '',
          item_cd: record.item_cd ?? '',
          process_cd: record.process_cd ?? '',
          defect_type_cd: record.defect_type_cd ?? '',
          defect_cause_cd: record.defect_cause_cd ?? '',
          defect_qty: record.defect_qty,
          remark: record.remark ?? '',
        });
        setUploadedFileId(record.file_id ?? null);
        setFileList([]);
      }
    }
  }, [open, mode, record, form]);

  /* ── Save handler ─── */
  const handleSave = useCallback(async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);

      const payload: Record<string, unknown> = {
        item_cd: values.item_cd,
        defect_type_cd: values.defect_type_cd,
        defect_qty: values.defect_qty,
      };
      if (values.lot_no) payload.lot_no = values.lot_no;
      if (values.process_cd) payload.process_cd = values.process_cd;
      if (values.defect_cause_cd) payload.defect_cause_cd = values.defect_cause_cd;
      if (values.remark) payload.remark = values.remark;
      if (uploadedFileId) payload.file_id = uploadedFileId;

      await apiClient.post('/v1/defects', payload);
      message.success('불량이 등록되었습니다.');
      form.resetFields();
      setFileList([]);
      setUploadedFileId(null);
      onSaved();
      onClose();
    } catch (err: any) {
      if (err?.errorFields) return;
      message.error(err?.response?.data?.message ?? '저장 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  }, [form, uploadedFileId, onSaved, onClose]);

  /* ── Delete handler (view mode, REGISTERED only) ─── */
  const handleDelete = useCallback(() => {
    if (!record) return;
    Modal.confirm({
      title: '불량 삭제',
      content: '이 불량 기록을 삭제하시겠습니까? 삭제 후 복구할 수 없습니다.',
      okText: '삭제',
      okType: 'danger',
      cancelText: '취소',
      onOk: async () => {
        try {
          await apiClient.delete(`/v1/defects/${record.defect_id}`);
          message.success('불량이 삭제되었습니다.');
          onSaved();
          onClose();
        } catch (err: any) {
          message.error(err?.response?.data?.message ?? '삭제에 실패했습니다.');
        }
      },
    });
  }, [record, onSaved, onClose]);

  /* ── Photo URL for view mode ─── */
  const photoUrl = record?.file_id
    ? `${API_BASE}/v1/files/${record.file_id}`
    : null;

  /* ── Footer ─── */
  const footer = isView ? (
    <Space>
      {record?.status === 'REGISTERED' && (
        <Button danger icon={<DeleteOutlined />} onClick={handleDelete}>
          삭제
        </Button>
      )}
      {record?.status !== 'COMPLETED' && onDisposeOpen && (
        <Button
          type="primary"
          onClick={() => {
            if (record) onDisposeOpen(record.defect_id);
          }}
        >
          후속조치 등록
        </Button>
      )}
      <Button onClick={onClose}>닫기</Button>
    </Space>
  ) : (
    <Space>
      <Button onClick={onClose}>취소</Button>
      <Button type="primary" loading={loading} onClick={handleSave}>
        등록
      </Button>
    </Space>
  );

  return (
    <Modal
      open={open}
      title={title}
      width={640}
      destroyOnClose
      maskClosable={false}
      footer={footer}
      onCancel={onClose}
    >
      <Form
        form={form}
        layout="horizontal"
        labelCol={{ span: 6 }}
        wrapperCol={{ span: 18 }}
        disabled={isView}
        autoComplete="off"
      >
        <Form.Item name="lot_no" label="LOT번호">
          <Input placeholder="LOT번호 입력" />
        </Form.Item>

        <Form.Item name="item_cd" label="품목" rules={[{ required: true, message: '품목을 입력하세요.' }]}>
          <Input placeholder="품목코드 입력" />
        </Form.Item>

        <Form.Item name="process_cd" label="공정">
          <Input placeholder="공정코드 입력" />
        </Form.Item>

        <Form.Item
          name="defect_type_cd"
          label="불량유형"
          rules={[{ required: true, message: '불량유형을 선택하세요.' }]}
        >
          <CommonCodeSelect groupCd="DEFECT_TYPE" placeholder="불량유형 선택" disabled={isView} />
        </Form.Item>

        <Form.Item name="defect_cause_cd" label="불량원인">
          <CommonCodeSelect groupCd="DEFECT_CAUSE" placeholder="불량원인 선택" disabled={isView} />
        </Form.Item>

        <Form.Item
          name="defect_qty"
          label="수량"
          rules={[
            { required: true, message: '수량을 입력하세요.' },
            { type: 'number', min: 1, message: '1 이상의 값을 입력하세요.' },
          ]}
        >
          <InputNumber min={1} style={{ width: '100%' }} placeholder="불량 수량" precision={0} />
        </Form.Item>

        {/* Photo section */}
        <Form.Item label="사진">
          {isView ? (
            photoUrl ? (
              <Image
                src={photoUrl}
                alt="불량 사진"
                style={{ maxWidth: 320 }}
                preview={{ src: photoUrl }}
              />
            ) : (
              <span style={{ color: '#999' }}>첨부된 사진 없음</span>
            )
          ) : (
            <>
              <FileUpload
                accept=".jpg,.jpeg,.png"
                maxCount={1}
                maxSizeMB={5}
                fileList={fileList}
                onChange={setFileList}
                onUploadComplete={(fileInfo) => setUploadedFileId(fileInfo.id)}
                listType="picture"
              />
              {uploadedFileId && fileList.length > 0 && (
                <div style={{ marginTop: 8 }}>
                  {fileList[0]?.url || fileList[0]?.thumbUrl ? (
                    <img
                      src={fileList[0].thumbUrl ?? fileList[0].url}
                      alt="미리보기"
                      style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 4 }}
                    />
                  ) : null}
                </div>
              )}
            </>
          )}
        </Form.Item>

        <Form.Item name="remark" label="비고">
          <Input.TextArea rows={3} placeholder="비고 입력" />
        </Form.Item>
      </Form>

      {/* Disposal history — view mode only */}
      {isView && record?.disposals && record.disposals.length > 0 && (
        <>
          <Divider style={{ fontSize: 13 }}>
            처리 이력
          </Divider>
          <Table<DisposalRow>
            columns={disposalColumns}
            dataSource={record.disposals}
            rowKey="dispose_id"
            size="small"
            pagination={false}
            bordered
          />
        </>
      )}
    </Modal>
  );
}
