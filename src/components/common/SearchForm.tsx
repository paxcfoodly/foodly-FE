'use client';

import React, { useCallback, useMemo, useRef, useState } from 'react';
import { Search, RotateCcw, ChevronDown, ChevronUp } from 'lucide-react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';

/* ── Types ─────────────────────────────────────────── */

export interface SearchFieldOption {
  label: string;
  value: string;
  disabled?: boolean;
}

export interface SearchFieldDef {
  /** 필드 이름 (Form.Item name) */
  name: string;
  /** 필드 라벨 */
  label: string;
  /** 필드 타입 */
  type: 'text' | 'select' | 'date' | 'dateRange';
  /** placeholder */
  placeholder?: string;
  /** select 옵션 */
  options?: SearchFieldOption[];
  /** 기본값 */
  defaultValue?: unknown;
  /** col span (기본 6 = 4열) */
  span?: number;
  /** select 모드 (기본 undefined = single) */
  selectMode?: 'multiple' | 'tags';
}

export interface SearchFormProps {
  /** 검색 필드 정의 배열 */
  fields: SearchFieldDef[];
  /** 검색 실행 콜백 */
  onSearch: (values: Record<string, unknown>) => void;
  /** 초기화 콜백 (옵션) */
  onReset?: () => void;
  /** 접기/펼치기 기본 표시 행 수 (기본 1줄 = 4필드, 0이면 접기 비활성) */
  collapsedRows?: number;
  /** 로딩 상태 */
  loading?: boolean;
  /** 추가 버튼 영역 (검색/초기화 옆) */
  extraButtons?: React.ReactNode;
}

/** 기본 1행에 표시할 필드 수 (24 / 6 = 4) */
const FIELDS_PER_ROW = 4;

/* ── Component ─────────────────────────────────────── */

export default function SearchForm({
  fields,
  onSearch,
  onReset,
  collapsedRows = 1,
  loading = false,
  extraButtons,
}: SearchFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const [expanded, setExpanded] = useState(false);

  /* 내부 상태: 각 필드 값을 name 기준으로 관리 */
  const initialValues = useMemo(() => {
    const vals: Record<string, unknown> = {};
    fields.forEach((f) => {
      if (f.defaultValue !== undefined) {
        vals[f.name] = f.defaultValue;
      } else {
        vals[f.name] = '';
      }
    });
    return vals;
  }, [fields]);

  const [values, setValues] = useState<Record<string, unknown>>(() => ({ ...initialValues }));

  const setValue = useCallback((name: string, val: unknown) => {
    setValues((prev) => ({ ...prev, [name]: val }));
  }, []);

  /** 접기/펼치기가 필요한지 여부 */
  const needsCollapse = useMemo(() => {
    if (collapsedRows <= 0) return false;
    const maxVisible = collapsedRows * FIELDS_PER_ROW;
    return fields.length > maxVisible;
  }, [fields, collapsedRows]);

  /** 현재 보여줄 필드 */
  const visibleFields = useMemo(() => {
    if (!needsCollapse || expanded) return fields;
    const maxVisible = collapsedRows * FIELDS_PER_ROW;
    return fields.slice(0, maxVisible);
  }, [fields, needsCollapse, expanded, collapsedRows]);

  /** 검색 실행 */
  const handleSearch = useCallback(() => {
    const transformed: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(values)) {
      if (val === undefined || val === null || val === '') continue;
      transformed[key] = val;
    }
    onSearch(transformed);
  }, [values, onSearch]);

  /** 초기화 */
  const handleReset = useCallback(() => {
    setValues({ ...initialValues });
    onReset?.();
  }, [initialValues, onReset]);

  /** Enter 키로 검색 */
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleSearch();
      }
    },
    [handleSearch],
  );

  /** 필드 렌더링 */
  const renderField = useCallback(
    (field: SearchFieldDef) => {
      const fieldValue = values[field.name];

      switch (field.type) {
        case 'text':
          return (
            <Input
              placeholder={field.placeholder ?? `${field.label} 입력`}
              value={(fieldValue as string) ?? ''}
              onChange={(e) => setValue(field.name, e.target.value)}
              onKeyDown={handleKeyDown}
            />
          );
        case 'select':
          return (
            <Select
              placeholder={field.placeholder ?? `${field.label} 선택`}
              value={(fieldValue as string) ?? ''}
              onChange={(e) => setValue(field.name, e.target.value)}
              options={field.options?.map((o) => ({
                label: o.label,
                value: o.value,
                disabled: o.disabled,
              })) ?? []}
            />
          );
        case 'date':
          return (
            <input
              type="date"
              className="w-full h-9 bg-dark-700 border border-dark-500 rounded-lg px-3 text-sm text-gray-700
                transition-all focus:outline-none focus:bg-white focus:border-cyan-accent focus:ring-2 focus:ring-cyan-accent/15"
              placeholder={field.placeholder ?? '날짜 선택'}
              value={(fieldValue as string) ?? ''}
              onChange={(e) => setValue(field.name, e.target.value)}
            />
          );
        case 'dateRange':
          // min-w-0 + flex-1 permits the native date inputs to shrink below
          // their intrinsic width (≈180px each) so the pair stays inside
          // the parent grid cell at narrow viewports instead of spilling
          // into the next field.
          return (
            <div className="flex items-center gap-1 min-w-0">
              <input
                type="date"
                className="flex-1 min-w-0 h-9 bg-dark-700 border border-dark-500 rounded-lg px-3 text-sm text-gray-700
                  transition-all focus:outline-none focus:bg-white focus:border-cyan-accent focus:ring-2 focus:ring-cyan-accent/15"
                placeholder="시작일"
                value={
                  Array.isArray(fieldValue) ? (fieldValue[0] as string) ?? '' : ''
                }
                onChange={(e) => {
                  const current = Array.isArray(fieldValue) ? fieldValue : ['', ''];
                  setValue(field.name, [e.target.value, current[1]]);
                }}
              />
              <span className="text-gray-400 text-xs shrink-0">~</span>
              <input
                type="date"
                className="flex-1 min-w-0 h-9 bg-dark-700 border border-dark-500 rounded-lg px-3 text-sm text-gray-700
                  transition-all focus:outline-none focus:bg-white focus:border-cyan-accent focus:ring-2 focus:ring-cyan-accent/15"
                placeholder="종료일"
                value={
                  Array.isArray(fieldValue) ? (fieldValue[1] as string) ?? '' : ''
                }
                onChange={(e) => {
                  const current = Array.isArray(fieldValue) ? fieldValue : ['', ''];
                  setValue(field.name, [current[0], e.target.value]);
                }}
              />
            </div>
          );
        default:
          return (
            <Input
              placeholder={field.placeholder}
              value={(fieldValue as string) ?? ''}
              onChange={(e) => setValue(field.name, e.target.value)}
              onKeyDown={handleKeyDown}
            />
          );
      }
    },
    [values, setValue, handleKeyDown],
  );

  return (
    <div className="rounded-lg p-4 pb-0 mb-4 bg-dark-700">
      <form ref={formRef} onSubmit={(e) => { e.preventDefault(); handleSearch(); }}>
        <div className="grid grid-cols-4 gap-4">
          {visibleFields.map((field) => {
            // span is expressed on a 24-unit base (legacy AntD convention)
            // but the grid is 4 columns, so bucket into col-span-1/2/3/4.
            // min-w-0 lets grid items shrink below content min-size so
            // dateRange's two date inputs don't overflow into neighbours
            // at narrow viewports.
            const span = field.span ?? 6;
            const colSpan =
              span >= 18 ? 'col-span-4'
              : span >= 12 ? 'col-span-2'
              : span >= 8 ? 'col-span-2'
              : 'col-span-1';
            return (
              <div key={field.name} className={`${colSpan} min-w-0`}>
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  {field.label}
                </label>
                {renderField(field)}
              </div>
            );
          })}
        </div>

        <div className="flex justify-end items-center gap-2 py-3">
          {needsCollapse && (
            <Button
              variant="link"
              size="small"
              icon={expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              onClick={() => setExpanded((prev) => !prev)}
              type="button"
            >
              {expanded ? '접기' : '펼치기'}
            </Button>
          )}
          {extraButtons}
          <Button
            icon={<RotateCcw className="w-4 h-4" />}
            onClick={handleReset}
            type="button"
          >
            초기화
          </Button>
          <Button
            variant="primary"
            icon={<Search className="w-4 h-4" />}
            onClick={handleSearch}
            loading={loading}
            type="button"
          >
            검색
          </Button>
        </div>
      </form>
    </div>
  );
}
