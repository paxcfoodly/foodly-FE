'use client';

import React, { useState, useCallback, useRef } from 'react';
import { Button, message, Modal, Typography, Space } from 'antd';
import { UploadOutlined, CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import apiClient from '@/lib/apiClient';

const { Text } = Typography;

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
  const fileInputRef = useRef<HTMLInputElement>(null);

  const showResult = useCallback((result: ExcelUploadResult) => {
    Modal.info({
      title: '엑셀 업로드 결과',
      width: 480,
      content: (
        <div style={{ marginTop: 12 }}>
          <Space direction="vertical" size={4}>
            <Text>
              <CheckCircleOutlined style={{ color: '#52c41a', marginRight: 4 }} />
              성공: <strong>{result.successCount}건</strong>
            </Text>
            <Text>
              <CloseCircleOutlined style={{ color: '#ff4d4f', marginRight: 4 }} />
              실패: <strong>{result.errorCount}건</strong>
            </Text>
          </Space>
          {result.errors && result.errors.length > 0 && (
            <div
              style={{
                marginTop: 12,
                maxHeight: 200,
                overflow: 'auto',
                background: '#fafafa',
                padding: 8,
                borderRadius: 4,
                fontSize: 12,
              }}
            >
              {result.errors.map((e, i) => (
                <div key={i} style={{ color: '#ff4d4f' }}>
                  행 {e.row}, {e.column}: {e.message}
                </div>
              ))}
            </div>
          )}
        </div>
      ),
    });
  }, []);

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

        showResult(result);
        onComplete?.(result);
      } catch (err: any) {
        console.error('[ExcelUploadButton]', err);
        message.error(err?.response?.data?.message ?? '엑셀 업로드에 실패했습니다.');
      } finally {
        setLoading(false);
      }
    },
    [uploadUrl, onComplete, showResult],
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
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />
      <Button
        icon={<UploadOutlined />}
        loading={loading}
        disabled={disabled}
        onClick={handleClick}
      >
        {label}
      </Button>
    </>
  );
}
