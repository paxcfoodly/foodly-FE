'use client';

import React, { useMemo } from 'react';
import { Tag } from '@/components/ui';

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
  const rows = useMemo(() => standards, [standards]);

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="bg-gray-50">
            <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 border border-gray-200" style={{ width: 160 }}>검사항목명</th>
            <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 border border-gray-200" style={{ width: 120 }}>검사방법</th>
            <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 border border-gray-200" style={{ width: 140 }}>규격</th>
            <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 border border-gray-200" style={{ width: 100 }}>목표값</th>
            <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 border border-gray-200" style={{ width: 140 }}>측정값</th>
            <th className="px-3 py-2 text-center text-xs font-semibold text-gray-500 border border-gray-200" style={{ width: 90 }}>판정</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((std) => {
            const result = judgeRow(values[std.inspect_std_id], std.lsl, std.usl);
            const lslStr = std.lsl !== null ? String(std.lsl) : '-';
            const uslStr = std.usl !== null ? String(std.usl) : '-';
            const specStr = std.lsl === null && std.usl === null ? '-' : `${lslStr} ~ ${uslStr}`;

            return (
              <tr key={std.inspect_std_id} className="hover:bg-gray-50">
                <td className="px-3 py-2 border border-gray-200 truncate">{std.inspect_item_nm}</td>
                <td className="px-3 py-2 border border-gray-200">{std.measure_type ?? '-'}</td>
                <td className="px-3 py-2 border border-gray-200">{specStr}</td>
                <td className="px-3 py-2 border border-gray-200">{std.target_val !== null ? String(std.target_val) : '-'}</td>
                <td className="px-3 py-2 border border-gray-200">
                  {readOnly ? (
                    <span>{values[std.inspect_std_id] !== null && values[std.inspect_std_id] !== undefined ? String(values[std.inspect_std_id]) : '-'}</span>
                  ) : (
                    <input
                      type="number"
                      step="any"
                      className="w-full h-7 bg-white border border-gray-200 rounded px-2 text-sm focus:outline-none focus:border-cyan-500"
                      value={values[std.inspect_std_id] ?? ''}
                      onChange={(e) => {
                        const val = e.target.value === '' ? null : Number(e.target.value);
                        onValueChange(std.inspect_std_id, val);
                      }}
                    />
                  )}
                </td>
                <td className="px-3 py-2 border border-gray-200 text-center">
                  {result === 'FAIL' ? <Tag color="error">불합격</Tag> :
                   result === 'PASS' ? <Tag color="success">합격</Tag> :
                   <Tag>미입력</Tag>}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
