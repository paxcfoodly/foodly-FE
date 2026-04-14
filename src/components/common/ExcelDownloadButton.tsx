'use client';

import React, { useState, useCallback } from 'react';
import { Download } from 'lucide-react';
import Button from '@/components/ui/Button';
import toast from '@/components/ui/toast';
import apiClient from '@/lib/apiClient';

/* ── Types ─────────────────────────────────────────── */

export interface ExcelColumn {
  header: string;
  key: string;
  width?: number;
}

export interface ExcelDownloadButtonProps {
  /** 다운로드 파일명 (확장자 제외) */
  filename: string;
  /** 엑셀 컬럼 정의 */
  columns: ExcelColumn[];
  /** 다운로드할 데이터 — 함수면 클릭 시 호출 */
  data: Record<string, unknown>[] | (() => Promise<Record<string, unknown>[]> | Record<string, unknown>[]);
  /** 버튼 텍스트 (기본 '엑셀 다운로드') */
  label?: string;
  /** 버튼 비활성화 */
  disabled?: boolean;
}

/* ── Component ────────────────────────────────────── */

export default function ExcelDownloadButton({
  filename,
  columns,
  data,
  label = '엑셀 다운로드',
  disabled = false,
}: ExcelDownloadButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleClick = useCallback(async () => {
    try {
      setLoading(true);

      // Resolve data
      const rows = typeof data === 'function' ? await data() : data;

      // Call BE export endpoint which streams an xlsx file
      const response = await apiClient.post(
        '/v1/excel/export',
        { columns, data: rows, filename },
        { responseType: 'blob' },
      );

      // Trigger browser download
      const blob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${filename}.xlsx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      toast.success('엑셀 다운로드 완료');
    } catch (err: any) {
      console.error('[ExcelDownloadButton]', err);
      toast.error(err?.message ?? '엑셀 다운로드에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  }, [columns, data, filename]);

  return (
    <Button
      icon={<Download className="w-4 h-4" />}
      loading={loading}
      disabled={disabled}
      onClick={handleClick}
    >
      {label}
    </Button>
  );
}
