'use client';

import React, { useState, useCallback, useRef } from 'react';
import { Upload, CheckCircle, XCircle } from 'lucide-react';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import toast from '@/components/ui/toast';
import apiClient from '@/lib/apiClient';

/* ── Types ─────────────────────────────────────────── */

export interface ExcelUploadResult {
  successCount: number;
  errorCount: number;
  errors?: Array<{ row: number; column: string; message: string }>;
}

export interface ExcelUploadButtonProps {
  /** 업로드 API 경로 (예: '/v1/items/import') */
  uploadUrl: string;
  /** 버튼 텍스트 (기본 '엑셀 업로드') */
  label?: string;
  /** 허용 확장자 (기본 .xlsx, .xls) */
  accept?: string;
  /** 업로드 완료 후 콜백 */
  onComplete?: (result: ExcelUploadResult) => void;
  /** 버튼 비활성화 */
  disabled?: boolean;
}

/* ── Component ────────────────────────────────────── */

export default function ExcelUploadButton({
  uploadUrl,
  label = '엑셀 업로드',
  accept = '.xlsx,.xls',
  onComplete,
  disabled = false,
}: ExcelUploadButtonProps) {
  const [loading, setLoading] = useState(false);
  const [resultModalOpen, setResultModalOpen] = useState(false);
  const [uploadResult, setUploadResult] = useState<ExcelUploadResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      // Reset so the same file can be re-selected
      e.target.value = '';

      try {
        setLoading(true);
        const formData = new FormData();
        formData.append('file', file);

        const response = await apiClient.post(uploadUrl, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });

        const result: ExcelUploadResult = response.data?.data ?? {
          successCount: 0,
          errorCount: 0,
        };

        setUploadResult(result);
        setResultModalOpen(true);
        onComplete?.(result);
      } catch (err: any) {
        console.error('[ExcelUploadButton]', err);
        toast.error(err?.response?.data?.message ?? '엑셀 업로드에 실패했습니다.');
      } finally {
        setLoading(false);
      }
    },
    [uploadUrl, onComplete],
  );

  const handleClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={handleFileChange}
      />
      <Button
        icon={<Upload className="w-4 h-4" />}
        loading={loading}
        disabled={disabled}
        onClick={handleClick}
      >
        {label}
      </Button>

      {/* Result Modal */}
      <Modal
        open={resultModalOpen}
        onClose={() => setResultModalOpen(false)}
        title="엑셀 업로드 결과"
        width={480}
        footer={
          <Button variant="primary" onClick={() => setResultModalOpen(false)}>
            확인
          </Button>
        }
      >
        {uploadResult && (
          <div>
            <div className="space-y-1">
              <p className="text-sm text-gray-700 flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4 text-green-600" />
                성공: <strong>{uploadResult.successCount}건</strong>
              </p>
              <p className="text-sm text-gray-700 flex items-center gap-1.5">
                <XCircle className="w-4 h-4 text-red-500" />
                실패: <strong>{uploadResult.errorCount}건</strong>
              </p>
            </div>
            {uploadResult.errors && uploadResult.errors.length > 0 && (
              <div className="mt-3 max-h-[200px] overflow-auto bg-dark-700 p-2 rounded text-xs">
                {uploadResult.errors.map((e, i) => (
                  <div key={i} className="text-red-500">
                    행 {e.row}, {e.column}: {e.message}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </Modal>
    </>
  );
}
