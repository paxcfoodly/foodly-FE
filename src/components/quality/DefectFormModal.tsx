'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { Button, Modal, Tag } from '@/components/ui';
import toast from '@/components/ui/toast';
import { confirm } from '@/components/ui/confirm';
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

/* ── Component ──────────────────────────────────────── */

export default function DefectFormModal({
  open,
  mode,
  record,
  onClose,
  onSaved,
  onDisposeOpen,
}: DefectFormModalProps) {
  const [loading, setLoading] = useState(false);
  const [fileList, setFileList] = useState<Array<{ uid: string; name: string; url?: string; thumbUrl?: string }>>([]);
  const [uploadedFileId, setUploadedFileId] = useState<number | null>(null);

  /* Form state */
  const [formLotNo, setFormLotNo] = useState('');
  const [formItemCd, setFormItemCd] = useState('');
  const [formProcessCd, setFormProcessCd] = useState('');
  const [formDefectTypeCd, setFormDefectTypeCd] = useState('');
  const [formDefectCauseCd, setFormDefectCauseCd] = useState('');
  const [formDefectQty, setFormDefectQty] = useState<string>('');
  const [formRemark, setFormRemark] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const isView = mode === 'view';
  const title = isView ? '불량 상세' : '불량 등록';

  /* ── Reset form when modal opens ─── */
  useEffect(() => {
    if (open) {
      if (mode === 'create') {
        setFormLotNo('');
        setFormItemCd('');
        setFormProcessCd('');
        setFormDefectTypeCd('');
        setFormDefectCauseCd('');
        setFormDefectQty('');
        setFormRemark('');
        setFileList([]);
        setUploadedFileId(null);
        setErrors({});
      } else if (record) {
        setFormLotNo(record.lot_no ?? '');
        setFormItemCd(record.item_cd ?? '');
        setFormProcessCd(record.process_cd ?? '');
        setFormDefectTypeCd(record.defect_type_cd ?? '');
        setFormDefectCauseCd(record.defect_cause_cd ?? '');
        setFormDefectQty(String(record.defect_qty));
        setFormRemark(record.remark ?? '');
        setUploadedFileId(record.file_id ?? null);
        setFileList([]);
      }
    }
  }, [open, mode, record]);

  /* ── Save handler ─── */
  const handleSave = useCallback(async () => {
    const newErrors: Record<string, string> = {};
    if (!formItemCd) newErrors.item_cd = '품목을 입력하세요.';
    if (!formDefectTypeCd) newErrors.defect_type_cd = '불량유형을 선택하세요.';
    if (!formDefectQty || Number(formDefectQty) < 1) newErrors.defect_qty = '1 이상의 값을 입력하세요.';
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    setErrors({});

    try {
      setLoading(true);

      const payload: Record<string, unknown> = {
        item_cd: formItemCd,
        defect_type_cd: formDefectTypeCd,
        defect_qty: Number(formDefectQty),
      };
      if (formLotNo) payload.lot_no = formLotNo;
      if (formProcessCd) payload.process_cd = formProcessCd;
      if (formDefectCauseCd) payload.defect_cause_cd = formDefectCauseCd;
      if (formRemark) payload.remark = formRemark;
      if (uploadedFileId) payload.file_id = uploadedFileId;

      await apiClient.post('/v1/defects', payload);
      toast.success('불량이 등록되었습니다.');
      onSaved();
      onClose();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? '저장 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  }, [formItemCd, formDefectTypeCd, formDefectQty, formLotNo, formProcessCd, formDefectCauseCd, formRemark, uploadedFileId, onSaved, onClose]);

  /* ── Delete handler (view mode, REGISTERED only) ─── */
  const handleDelete = useCallback(() => {
    if (!record) return;
    confirm({
      title: '불량 삭제',
      content: '이 불량 기록을 삭제하시겠습니까? 삭제 후 복구할 수 없습니다.',
      okText: '삭제',
      danger: true,
      onOk: async () => {
        try {
          await apiClient.delete(`/v1/defects/${record.defect_id}`);
          toast.success('불량이 삭제되었습니다.');
          onSaved();
          onClose();
        } catch (err: any) {
          toast.error(err?.response?.data?.message ?? '삭제에 실패했습니다.');
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
    <div className="flex items-center gap-2">
      {record?.status === 'REGISTERED' && (
        <Button variant="danger" icon={<Trash2 className="w-4 h-4" />} onClick={handleDelete}>
          삭제
        </Button>
      )}
      {record?.status !== 'COMPLETED' && onDisposeOpen && (
        <Button
          variant="primary"
          onClick={() => {
            if (record) onDisposeOpen(record.defect_id);
          }}
        >
          후속조치 등록
        </Button>
      )}
      <Button onClick={onClose}>닫기</Button>
    </div>
  ) : (
    <div className="flex items-center gap-2">
      <Button onClick={onClose}>취소</Button>
      <Button variant="primary" loading={loading} onClick={handleSave}>
        등록
      </Button>
    </div>
  );

  return (
    <Modal
      open={open}
      title={title}
      width={640}
      maskClosable={false}
      footer={footer}
      onClose={onClose}
    >
      <div className={isView ? 'pointer-events-none opacity-70' : ''}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">LOT번호</label>
            <input
              className="w-full h-9 bg-gray-50 border border-gray-200 rounded-lg px-3 text-sm text-gray-700 focus:outline-none focus:border-cyan-500"
              placeholder="LOT번호 입력"
              value={formLotNo}
              onChange={(e) => setFormLotNo(e.target.value)}
              disabled={isView}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">
              품목 <span className="text-red-500">*</span>
            </label>
            <input
              className={`w-full h-9 bg-gray-50 border rounded-lg px-3 text-sm text-gray-700 focus:outline-none focus:border-cyan-500 ${errors.item_cd ? 'border-red-400' : 'border-gray-200'}`}
              placeholder="품목코드 입력"
              value={formItemCd}
              onChange={(e) => setFormItemCd(e.target.value)}
              disabled={isView}
            />
            {errors.item_cd && <p className="text-red-500 text-xs mt-1">{errors.item_cd}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">공정</label>
            <input
              className="w-full h-9 bg-gray-50 border border-gray-200 rounded-lg px-3 text-sm text-gray-700 focus:outline-none focus:border-cyan-500"
              placeholder="공정코드 입력"
              value={formProcessCd}
              onChange={(e) => setFormProcessCd(e.target.value)}
              disabled={isView}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">
              불량유형 <span className="text-red-500">*</span>
            </label>
            <CommonCodeSelect
              groupCd="DEFECT_TYPE"
              placeholder="불량유형 선택"
              disabled={isView}
              value={formDefectTypeCd}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFormDefectTypeCd(e.target.value)}
            />
            {errors.defect_type_cd && <p className="text-red-500 text-xs mt-1">{errors.defect_type_cd}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">불량원인</label>
            <CommonCodeSelect
              groupCd="DEFECT_CAUSE"
              placeholder="불량원인 선택"
              disabled={isView}
              value={formDefectCauseCd}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFormDefectCauseCd(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">
              수량 <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              className={`w-full h-9 bg-gray-50 border rounded-lg px-3 text-sm text-gray-700 focus:outline-none focus:border-cyan-500 ${errors.defect_qty ? 'border-red-400' : 'border-gray-200'}`}
              min={1}
              placeholder="불량 수량"
              value={formDefectQty}
              onChange={(e) => setFormDefectQty(e.target.value)}
              disabled={isView}
            />
            {errors.defect_qty && <p className="text-red-500 text-xs mt-1">{errors.defect_qty}</p>}
          </div>

          {/* Photo section */}
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">사진</label>
            {isView ? (
              photoUrl ? (
                <img
                  src={photoUrl}
                  alt="불량 사진"
                  className="max-w-[320px] rounded"
                />
              ) : (
                <span className="text-gray-400 text-sm">첨부된 사진 없음</span>
              )
            ) : (
              <>
                <FileUpload
                  accept=".jpg,.jpeg,.png"
                  maxCount={1}
                  maxSizeMB={5}
                  fileList={fileList as any}
                  onChange={setFileList as any}
                  onUploadComplete={(fileInfo: any) => setUploadedFileId(fileInfo.id)}
                  listType="picture"
                />
                {uploadedFileId && fileList.length > 0 && (
                  <div className="mt-2">
                    {(fileList[0] as any)?.url || (fileList[0] as any)?.thumbUrl ? (
                      <img
                        src={(fileList[0] as any).thumbUrl ?? (fileList[0] as any).url}
                        alt="미리보기"
                        className="w-20 h-20 object-cover rounded"
                      />
                    ) : null}
                  </div>
                )}
              </>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">비고</label>
            <textarea
              className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:border-cyan-500"
              rows={3}
              placeholder="비고 입력"
              value={formRemark}
              onChange={(e) => setFormRemark(e.target.value)}
              disabled={isView}
            />
          </div>
        </div>
      </div>

      {/* Disposal history — view mode only */}
      {isView && record?.disposals && record.disposals.length > 0 && (
        <>
          <div className="border-t border-gray-200 mt-6 pt-4">
            <h4 className="text-sm font-semibold text-gray-600 mb-3">처리 이력</h4>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 border border-gray-200" style={{ width: 100 }}>처리유형</th>
                    <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500 border border-gray-200" style={{ width: 90 }}>처리수량</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 border border-gray-200" style={{ width: 100 }}>승인자</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 border border-gray-200" style={{ width: 160 }}>처리일시</th>
                  </tr>
                </thead>
                <tbody>
                  {record.disposals.map((d) => (
                    <tr key={d.dispose_id} className="hover:bg-gray-50">
                      <td className="px-3 py-2 border border-gray-200">
                        <Tag color={DISPOSE_TYPE_COLOR[d.dispose_type] ?? 'default'}>
                          {DISPOSE_TYPE_LABEL[d.dispose_type] ?? d.dispose_type}
                        </Tag>
                      </td>
                      <td className="px-3 py-2 border border-gray-200 text-right">{d.dispose_qty?.toLocaleString() ?? '-'}</td>
                      <td className="px-3 py-2 border border-gray-200">{(d.approve_by as string) || '-'}</td>
                      <td className="px-3 py-2 border border-gray-200">{d.create_dt ? new Date(d.create_dt).toLocaleString('ko-KR') : '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </Modal>
  );
}
