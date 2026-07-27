'use client';

import { Inbox } from 'lucide-react';

/**
 * 대시보드 차트/위젯의 데이터 없음 상태.
 * 신규 회사 등 실적 데이터가 아직 없을 때 가짜 데모 대신 표시한다.
 */
export default function DashboardEmpty({ height = 200, label = '데이터가 없습니다' }: { height?: number; label?: string }) {
  return (
    <div
      className="flex flex-col items-center justify-center text-slate-300 gap-2"
      style={{ height }}
    >
      <Inbox className="w-8 h-8" />
      <span className="text-xs text-slate-400">{label}</span>
    </div>
  );
}
