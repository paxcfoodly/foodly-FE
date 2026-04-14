'use client';

import React, { useState, useCallback, useRef } from 'react';
import { Upload, Inbox } from 'lucide-react';
import Button from '@/components/ui/Button';
import toast from '@/components/ui/toast';

/* ── Types ─────────────────────────────────────────── */

export interface UploadFileInfo {
  uid: string;
  name: string;
  status?: 'uploading' | 'done' | 'error';
  url?: string;
  response?: unknown;
}

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
  fileList?: UploadFileInfo[];
  /** 파일 목록 변경 콜백 */
  onChange?: (fileList: UploadFileInfo[]) => void;
  /** 업로드 완료 콜백 */
  onUploadComplete?: (fileInfo: { id: number; original_nm: string }) => void;
  /** 비활성화 */
  disabled?: boolean;
  /** 목록 표시 타입 (기본 'text') */
  listType?: 'text' | 'picture';
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
}: FileUploadProps) {
  const [internalFileList, setInternalFileList] = useState<UploadFileInfo[]>([]);
  const fileList = controlledFileList ?? internalFileList;
  const setFileList = onChange ?? setInternalFileList;
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  /* Authorization 헤더 */
  const getHeaders = useCallback((): Record<string, string> => {
    if (typeof window === 'undefined') return {};
    const token = localStorage.getItem('accessToken');
    return token ? { Authorization: `Bearer ${token}` } : {};
  }, []);

  /* 파일 업로드 처리 */
  const uploadFile = useCallback(
    async (file: File) => {
      const sizeMB = file.size / 1024 / 1024;
      if (sizeMB > maxSizeMB) {
        toast.error(`파일 크기는 ${maxSizeMB}MB 이하만 가능합니다.`);
        return;
      }

      if (fileList.length >= maxCount) {
        toast.error(`최대 ${maxCount}개 파일만 업로드 가능합니다.`);
        return;
      }

      const uid = `upload-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const newFile: UploadFileInfo = { uid, name: file.name, status: 'uploading' };
      setFileList([...fileList, newFile]);

      try {
        const formData = new FormData();
        formData.append(fieldName, file);
        if (refTable) formData.append('ref_table', refTable);
        if (refId) formData.append('ref_id', refId);

        const url = action ?? `${API_BASE}/v1/files/upload`;
        const res = await fetch(url, {
          method: 'POST',
          headers: getHeaders(),
          body: formData,
        });

        const resp = await res.json();

        if (resp?.success && resp.data) {
          const uploaded = Array.isArray(resp.data) ? resp.data[0] : resp.data;
          const updated = fileList.map((f) =>
            f.uid === uid ? { ...f, status: 'done' as const, response: resp } : f,
          );
          setFileList([...updated, { ...newFile, status: 'done' as const, response: resp }].filter(
            (f, i, arr) => arr.findIndex((x) => x.uid === f.uid) === i,
          ));
          onUploadComplete?.(uploaded);
          toast.success(`${file.name} 업로드 완료`);
        } else {
          setFileList(fileList.filter((f) => f.uid !== uid));
          toast.error(`${file.name} 업로드 실패`);
        }
      } catch {
        setFileList(fileList.filter((f) => f.uid !== uid));
        toast.error(`${file.name} 업로드 실패`);
      }
    },
    [fileList, setFileList, maxSizeMB, maxCount, fieldName, refTable, refId, action, getHeaders, onUploadComplete],
  );

  /* 파일 선택 핸들러 */
  const handleFiles = useCallback(
    (files: FileList | null) => {
      if (!files) return;
      Array.from(files).forEach((file) => uploadFile(file));
    },
    [uploadFile],
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      handleFiles(e.target.files);
      e.target.value = '';
    },
    [handleFiles],
  );

  /* 파일 제거 */
  const handleRemove = useCallback(
    (uid: string) => {
      setFileList(fileList.filter((f) => f.uid !== uid));
    },
    [fileList, setFileList],
  );

  /* 드래그 핸들러 */
  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      if (disabled) return;
      handleFiles(e.dataTransfer.files);
    },
    [disabled, handleFiles],
  );

  const hiddenInput = (
    <input
      ref={inputRef}
      type="file"
      accept={accept}
      multiple={maxCount > 1}
      className="hidden"
      onChange={handleInputChange}
      disabled={disabled}
    />
  );

  /* 파일 목록 표시 */
  const fileListUI = fileList.length > 0 && (
    <ul className="mt-2 space-y-1">
      {fileList.map((f) => (
        <li key={f.uid} className="flex items-center justify-between text-sm text-gray-600 bg-dark-700 rounded px-3 py-1.5">
          <span className="truncate">{f.name}</span>
          <button
            type="button"
            onClick={() => handleRemove(f.uid)}
            className="text-gray-400 hover:text-red-500 ml-2 shrink-0"
          >
            &times;
          </button>
        </li>
      ))}
    </ul>
  );

  if (dragger) {
    return (
      <div>
        {hiddenInput}
        <div
          className={`
            border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
            ${dragOver ? 'border-cyan-accent bg-cyan-accent/5' : 'border-dark-500 hover:border-cyan-accent'}
            ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
          `}
          onClick={() => !disabled && inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
        >
          <Inbox className="w-10 h-10 text-gray-400 mx-auto mb-2" />
          <p className="text-sm text-gray-600">파일을 드래그하거나 클릭하여 업로드</p>
          <p className="text-xs text-gray-400 mt-1">
            최대 {maxCount}개, {maxSizeMB}MB 이하
          </p>
        </div>
        {fileListUI}
      </div>
    );
  }

  return (
    <div>
      {hiddenInput}
      <Button
        icon={<Upload className="w-4 h-4" />}
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
      >
        파일 선택
      </Button>
      {fileListUI}
    </div>
  );
}
