'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Button, DatePicker, Form, InputNumber, Row, Col, Select, Space } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import type { Dayjs } from 'dayjs';
import apiClient from '@/lib/apiClient';

const { RangePicker } = DatePicker;

interface ItemOption {
  item_cd: string;
  item_nm: string;
}

interface InspectStdOption {
  inspect_std_id: number;
  inspect_item_nm: string;
}

interface SpcFilterFormProps {
  onSearch: (params: {
    inspect_std_id: number;
    subgroup_size: number;
    start_date?: string;
    end_date?: string;
  }) => void;
  loading?: boolean;
}

export default function SpcFilterForm({ onSearch, loading = false }: SpcFilterFormProps) {
  const [form] = Form.useForm();
  const [items, setItems] = useState<ItemOption[]>([]);
  const [inspectStds, setInspectStds] = useState<InspectStdOption[]>([]);
  const [stdsLoading, setStdsLoading] = useState(false);

  // Fetch items on mount
  useEffect(() => {
    apiClient
      .get<{ data: ItemOption[] }>('/v1/items', { params: { limit: 200 } })
      .then((res) => {
        const data = res.data?.data;
        if (Array.isArray(data)) {
          setItems(data);
        }
      })
      .catch(() => {
        // silently fail — items optional filter
      });
  }, []);

  const handleItemChange = useCallback(
    (itemCd: string | undefined) => {
      form.setFieldValue('inspect_std_id', undefined);
      setInspectStds([]);
      if (!itemCd) return;
      setStdsLoading(true);
      apiClient
        .get<{ data: InspectStdOption[] }>('/v1/spc/inspect-stds', {
          params: { item_cd: itemCd },
        })
        .then((res) => {
          const data = res.data?.data;
          if (Array.isArray(data)) setInspectStds(data);
        })
        .catch(() => {})
        .finally(() => setStdsLoading(false));
    },
    [form],
  );

  const handleSearch = useCallback(() => {
    form.validateFields().then((values) => {
      const { inspect_std_id, subgroup_size, date_range } = values as {
        inspect_std_id: number;
        subgroup_size: number;
        date_range?: [Dayjs, Dayjs];
      };

      onSearch({
        inspect_std_id,
        subgroup_size: subgroup_size ?? 5,
        start_date: date_range?.[0]?.format('YYYY-MM-DD'),
        end_date: date_range?.[1]?.format('YYYY-MM-DD'),
      });
    });
  }, [form, onSearch]);

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
      <Form form={form} layout="vertical" initialValues={{ subgroup_size: 5 }}>
        <Row gutter={16}>
          <Col span={6}>
            <Form.Item name="item_cd" label="품목">
              <Select
                placeholder="품목 선택"
                allowClear
                showSearch
                optionFilterProp="label"
                options={items.map((i) => ({ value: i.item_cd, label: `${i.item_cd} - ${i.item_nm}` }))}
                onChange={handleItemChange}
              />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item
              name="inspect_std_id"
              label="검사항목"
              rules={[{ required: true, message: '검사항목을 선택하세요' }]}
            >
              <Select
                placeholder="검사항목 선택"
                allowClear
                showSearch
                optionFilterProp="label"
                loading={stdsLoading}
                options={inspectStds.map((s) => ({
                  value: s.inspect_std_id,
                  label: s.inspect_item_nm,
                }))}
              />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name="date_range" label="기간">
              <RangePicker placeholder={['시작일', '종료일']} style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col span={4}>
            <Form.Item
              name="subgroup_size"
              label="서브그룹크기"
              rules={[{ required: true }]}
            >
              <InputNumber min={2} max={10} style={{ width: '100%' }} />
            </Form.Item>
          </Col>
        </Row>
        <Row justify="end" style={{ marginBottom: 12 }}>
          <Space>
            <Button
              type="primary"
              icon={<SearchOutlined />}
              onClick={handleSearch}
              loading={loading}
            >
              조회
            </Button>
          </Space>
        </Row>
      </Form>
    </div>
  );
}
