'use client';

import React, { useCallback, useMemo, useState } from 'react';
import {
  Form,
  Input,
  Select,
  DatePicker,
  Button,
  Row,
  Col,
  Space,
} from 'antd';
import {
  SearchOutlined,
  ReloadOutlined,
  DownOutlined,
  UpOutlined,
} from '@ant-design/icons';
import type { Dayjs } from 'dayjs';

const { RangePicker } = DatePicker;

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
const DEFAULT_SPAN = 6;

/* ── Component ─────────────────────────────────────── */

export default function SearchForm({
  fields,
  onSearch,
  onReset,
  collapsedRows = 1,
  loading = false,
  extraButtons,
}: SearchFormProps) {
  const [form] = Form.useForm();
  const [expanded, setExpanded] = useState(false);

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

  /** 기본값 계산 */
  const initialValues = useMemo(() => {
    const vals: Record<string, unknown> = {};
    fields.forEach((f) => {
      if (f.defaultValue !== undefined) {
        vals[f.name] = f.defaultValue;
      }
    });
    return vals;
  }, [fields]);

  /** 검색 실행 */
  const handleSearch = useCallback(() => {
    const values = form.getFieldsValue();
    // dayjs → string 변환
    const transformed: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(values)) {
      if (val === undefined || val === null) continue;
      if (Array.isArray(val) && val.length === 2 && val[0]?.format) {
        // DateRange
        transformed[key] = [
          (val[0] as Dayjs).format('YYYY-MM-DD'),
          (val[1] as Dayjs).format('YYYY-MM-DD'),
        ];
      } else if (val && typeof val === 'object' && 'format' in val) {
        // Single Date
        transformed[key] = (val as Dayjs).format('YYYY-MM-DD');
      } else {
        transformed[key] = val;
      }
    }
    onSearch(transformed);
  }, [form, onSearch]);

  /** 초기화 */
  const handleReset = useCallback(() => {
    form.resetFields();
    onReset?.();
  }, [form, onReset]);

  /** 필드 렌더링 */
  const renderField = useCallback((field: SearchFieldDef) => {
    switch (field.type) {
      case 'text':
        return (
          <Input
            placeholder={field.placeholder ?? `${field.label} 입력`}
            allowClear
            onPressEnter={handleSearch}
          />
        );
      case 'select':
        return (
          <Select
            placeholder={field.placeholder ?? `${field.label} 선택`}
            allowClear
            showSearch
            optionFilterProp="label"
            mode={field.selectMode}
            options={field.options}
          />
        );
      case 'date':
        return (
          <DatePicker
            placeholder={field.placeholder ?? '날짜 선택'}
            style={{ width: '100%' }}
          />
        );
      case 'dateRange':
        return (
          <RangePicker
            placeholder={['시작일', '종료일']}
            style={{ width: '100%' }}
          />
        );
      default:
        return <Input placeholder={field.placeholder} allowClear />;
    }
  }, [handleSearch]);

  return (
    <div
      style={{
        background: '#fff',
        padding: '16px 16px 0',
        marginBottom: 16,
        borderRadius: 6,
        border: '1px solid #f0f0f0',
      }}
    >
      <Form form={form} initialValues={initialValues} layout="vertical">
        <Row gutter={16}>
          {visibleFields.map((field) => (
            <Col key={field.name} span={field.span ?? DEFAULT_SPAN}>
              <Form.Item name={field.name} label={field.label} style={{ marginBottom: 12 }}>
                {renderField(field)}
              </Form.Item>
            </Col>
          ))}
        </Row>

        <Row justify="end" style={{ marginBottom: 12 }}>
          <Space>
            {needsCollapse && (
              <Button
                type="link"
                size="small"
                icon={expanded ? <UpOutlined /> : <DownOutlined />}
                onClick={() => setExpanded((prev) => !prev)}
              >
                {expanded ? '접기' : '펼치기'}
              </Button>
            )}
            {extraButtons}
            <Button icon={<ReloadOutlined />} onClick={handleReset}>
              초기화
            </Button>
            <Button
              type="primary"
              icon={<SearchOutlined />}
              onClick={handleSearch}
              loading={loading}
            >
              검색
            </Button>
          </Space>
        </Row>
      </Form>
    </div>
  );
}
