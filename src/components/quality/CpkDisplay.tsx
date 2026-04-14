'use client';

import React from 'react';

interface CpkDisplayProps {
  cp: number | null;
  cpk: number | null;
  totalCount: number;
  subgroupCount: number;
}

function getCpkColor(value: number | null): string {
  if (value === null) return '#8c8c8c';
  if (value >= 1.33) return '#52c41a';
  if (value >= 1.0) return '#faad14';
  return '#ff4d4f';
}

function formatCpk(value: number | null): string {
  if (value === null) return '-';
  return value.toFixed(3);
}

export default function CpkDisplay({ cp, cpk, totalCount, subgroupCount }: CpkDisplayProps) {
  return (
    <div>
      <div className="font-semibold mb-2 text-sm">공정능력 지수</div>
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 text-center">
          <div className="text-sm text-gray-500 mb-1">Cp</div>
          <div className="text-[28px] font-bold" style={{ color: getCpkColor(cp) }}>
            {formatCpk(cp)}
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 text-center">
          <div className="text-sm text-gray-500 mb-1">Cpk</div>
          <div className="text-[28px] font-bold" style={{ color: getCpkColor(cpk) }}>
            {formatCpk(cpk)}
          </div>
        </div>
      </div>
      <div className="mt-3 text-gray-600 text-[13px]">
        <span className="mr-4">총 데이터: {totalCount}건</span>
        <span>서브그룹: {subgroupCount}개</span>
      </div>
      <div className="mt-2 text-gray-400 text-xs">
        <span className="mr-2" style={{ color: '#52c41a' }}>■ 우수 (≥1.33)</span>
        <span className="mr-2" style={{ color: '#faad14' }}>■ 보통 (1.00-1.32)</span>
        <span style={{ color: '#ff4d4f' }}>■ 불량 (&lt;1.00)</span>
      </div>
    </div>
  );
}
