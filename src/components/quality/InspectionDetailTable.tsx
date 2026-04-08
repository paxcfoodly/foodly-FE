'use client';

import React, { useMemo } from 'react';
import { Table, InputNumber, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';

/* ── Types ─────────────────────────────────────────── */

export interface InspectStdRow {
  inspect_std_id: number;
  inspect_item_nm: string;
  measure_type: string | null;
  lsl: number | null;
  target_val: number | null;
  usl: number | null;
  unit: string | null;
}

export interface InspectionDetailTableProps {
  standards: InspectStdRow[];
  values: Record<number, number | null>;
  onValueChange: (inspectStdId: number, value: number | null) => void;
  readOnly?: boolean;
}

/* ── Judgment helper ─────────────────────────────── */

function judgeRow(
  value: number | null | undefined,
  lsl: number | null,
  usl: number | null,
): 'PASS' | 'FAIL' | 'EMPTY' {
  if (value === null || value === undefined) return 'EMPTY';
  if (lsl !== null && value < lsl) return 'FAIL';
  if (usl !== null && value > usl) return 'FAIL';
  return 'PASS';
}

/* ── Component ────────────────────────────────────── */

export default function InspectionDetailTable({
  standards,
  values,
  onValueChange,
  readOnly = false,
}: InspectionDetailTableProps) {
  const columns: ColumnsType<InspectStdRow> = useMemo(
    () => [
      {
        title: '검사항목명',
        dataIndex: 'inspect_item_nm',
        key: 'inspect_item_nm',
        width: 160,
        ellipsis: true,
      },
      {
        title: '검사방법',
        dataIndex: 'measure_type',
        key: 'measure_type',
        width: 120,
        render: (val: string | null) => val ?? '-',
      },
      {
        title: '규격',
        key: 'spec',
        width: 140,
        render: (_: unknown, record: InspectStdRow) => {
          const { lsl, usl } = record;
          if (lsl === null && usl === null) return '-';
          const lslStr = lsl !== null ? String(lsl) : '-';
          const uslStr = usl !== null ? String(usl) : '-';
          return `${lslStr} ~ ${uslStr}`;
        },
      },
      {
        title: '목표값',
        dataIndex: 'target_val',
        key: 'target_val',
        width: 100,
        render: (val: number | null) => (val !== null ? `${val}${'' }` : '-'),
      },
      {
        title: '측정값',
        key: 'measure_value',
        width: 140,
        render: (_: unknown, record: InspectStdRow) => {
          if (readOnly) {
            const v = values[record.inspect_std_id];
            return v !== null && v !== undefined ? String(v) : '-';
          }
          return (
            <InputNumber
              size="small"
              style={{ width: '100%' }}
              value={values[record.inspect_std_id] ?? undefined}
              onChange={(v) => onValueChange(record.inspect_std_id, v)}
              precision={4}
            />
          );
        },
      },
      {
        title: '판정',
        key: 'judge',
        width: 90,
        align: 'center',
        render: (_: unknown, record: InspectStdRow) => {
          const result = judgeRow(
            values[record.inspect_std_id],
            record.lsl,
            record.usl,
          );
          if (result === 'FAIL') return <Tag color="error">불합격</Tag>;
          if (result === 'PASS') return <Tag color="success">합격</Tag>;
          return <Tag>미입력</Tag>;
        },
      },
    ],
    [values, onValueChange, readOnly],
  );

  return (
    <Table<InspectStdRow>
      columns={columns}
      dataSource={standards}
      rowKey="inspect_std_id"
      pagination={false}
      size="small"
      bordered
    />
  );
}
