'use client';

import React from 'react';

interface CpkRow {
  itemName: string;
  inspectItem: string;
  cpk: number;
}

interface CpkTableProps {
  data: CpkRow[];
}

function getCpkStyle(cpk: number): string {
  if (cpk >= 1.33) return 'bg-green-100 text-green-800';
  if (cpk >= 1.0) return 'bg-yellow-100 text-yellow-800';
  return 'bg-red-100 text-red-800';
}

export default function CpkTable({ data }: CpkTableProps) {
  return (
    <div className="max-h-[260px] overflow-y-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-gray-100">
            <th className="text-left py-2 px-2 font-medium text-gray-500">품목</th>
            <th className="text-left py-2 px-2 font-medium text-gray-500">검사항목</th>
            <th className="text-center py-2 px-2 font-medium text-gray-500">Cpk</th>
          </tr>
        </thead>
        <tbody>
          {data.map((r, i) => (
            <tr key={i} className="border-b border-gray-50">
              <td className="py-1.5 px-2 text-gray-700">{r.itemName}</td>
              <td className="py-1.5 px-2 text-gray-600">{r.inspectItem}</td>
              <td className="py-1.5 px-2 text-center">
                <span
                  className={`inline-block px-2 py-0.5 rounded font-mono font-medium text-[11px] ${getCpkStyle(r.cpk)}`}
                >
                  {r.cpk.toFixed(2)}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
