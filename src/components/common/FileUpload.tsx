'use client';

import React, { useState, useCallback } from 'react';
import { Upload, Button, message } from 'antd';
import { UploadOutlined, InboxOutlined } from '@ant-design/icons';
import type { UploadProps, UploadFile, UploadChangeParam } from 'antd/es/upload';

/* ── Types ─────────────────────────────────────────── */

export interface FileUploadProps {
  /** 업로드 API 경로 (기본 '/api/v1/files/upload') */
  action?: string;
  /** form data field name (기본 'file') */
  fieldName?: string;
  /** 최대 파일 수 (기본 5) */
  maxCount?: number;
  /** 최대 파일 크기 (MB, 기본 10) */
  maxSizeMB?: number;
  /** 허용 확장자 (예: '.jpg,.png,.pdf') */
  accept?: string;
  /** 드래그 영역 사용 여부 (기본 false) */
  dragger?: boolean;
  /** 참조 테이블명 (업로드 시 ref_table로 전달) */
  refTable?: string;
  /** 참조 ID (업로드 시 ref_id로 전달) */
  refId?: string;
  /** 기존 파일 목록 */
  fileList?: UploadFile[];
  /** 파일 목록 변경 콜백 */
  onChange?: (fileList: UploadFile[]) => void;
  /** 업로드 완료 콜백 */
  onUploadComplete?: (fileInfo: { id: number; original_nm: string }) => void;
  /** 비활성화 */
  disabled?: boolean;
  /** 목록 표시 타입 (기본 'text') */
  listType?: UploadProps['listType'];
}

/* ── Component ────────────────────────────────────── */

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080/api';

export default function FileUpload({
  action,
  fieldName = 'file',
  maxCount = 5,
  maxSizeMB = 10,
  accept,
  dragger = false,
  refTable,
  refId,
  fileList: controlledFileList,
  onChange,
  onUploadComplete,
  disabled = false,
  listType = 'text',
}: FileUploadProps) {
  const [internalFileList, setInternalFileList] = useState<UploadFile[]>([]);
  const fileList = controlledFileList ?? internalFileList;
  const setFileList = onChange ?? setInternalFileList;

  /* 업로드 전 검증 */
  const beforeUpload = useCallback(
    (file: File) => {
      const sizeMB = file.size / 1024 / 1024;
      if (sizeMB > maxSizeMB) {
        message.error(`파일 크기는 ${maxSizeMB}MB 이하만 가능합니다.`);
        return Upload.LIST_IGNORE;
      }
      return true;
    },
    [maxSizeMB],
  );

  /* 파일 목록 변경 */
  const handleChange = useCallback(
    (info: UploadChangeParam<UploadFile>) => {
      setFileList(info.fileList);

      if (info.file.status === 'done') {
        const resp = info.file.response;
        if (resp?.success && resp.data) {
          const uploaded = Array.isArray(resp.data) ? resp.data[0] : resp.data;
          onUploadComplete?.(uploaded);
          message.success(`${info.file.name} 업로드 완료`);
        }
      } else if (info.file.status === 'error') {
        message.error(`${info.file.name} 업로드 실패`);
      }
    },
    [setFileList, onUploadComplete],
  );

  /* Authorization 헤더 */
  const getHeaders = useCallback((): Record<string, string> => {
    if (typeof window === 'undefined') return {};
    const token = localStorage.getItem('accessToken');
    return token ? { Authorization: `Bearer ${token}` } : {};
  }, []);

  /* 추가 form data */
  const getData = useCallback(() => {
    const d: Record<string, string> = {};
    if (refTable) d.ref_table = refTable;
    if (refId) d.ref_id = refId;
    return d;
  }, [refTable, refId]);

  const uploadProps: UploadProps = {
    action: action ?? `${API_BASE}/v1/files/upload`,
    name: fieldName,
    maxCount,
    accept,
    fileList,
    beforeUpload,
    onChange: handleChange,
    headers: getHeaders(),
    data: getData(),
    disabled,
    listType,
  };

  if (dragger) {
    return (
      <Upload.Dragger {...uploadProps}>
        <p className="ant-upload-drag-icon">
          <InboxOutlined />
        </p>
        <p className="ant-upload-text">파일을 드래그하거나 클릭하여 업로드</p>
        <p className="ant-upload-hint">
          최대 {maxCount}개, {maxSizeMB}MB 이하
        </p>
      </Upload.Dragger>
    );
  }

  return (
    <Upload {...uploadProps}>
      <Button icon={<UploadOutlined />} disabled={disabled}>
        파일 선택
      </Button>
    </Upload>
  );
}
