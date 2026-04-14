'use client';

import React from 'react';
import Link from 'next/link';
import { BarChart3, ShieldCheck, Settings, Monitor } from 'lucide-react';

const dashboards = [
  {
    title: '생산종합 대시보드',
    description: '금일 생산 달성률, 라인별 현황, 시간대별 추이, 불량 Top 5',
    href: '/dashboard/production',
    icon: BarChart3,
    color: 'bg-blue-50 text-blue-700',
    iconBg: 'bg-blue-100',
  },
  {
    title: '품질종합 대시보드',
    description: '검사 합격률, 파레토 분석, 공정별 불량률, SPC 현황',
    href: '/dashboard/quality',
    icon: ShieldCheck,
    color: 'bg-green-50 text-green-700',
    iconBg: 'bg-green-100',
  },
  {
    title: '설비종합 대시보드',
    description: 'OEE, 설비별 가동률, 비가동 사유, MTBF/MTTR 추이',
    href: '/dashboard/equipment',
    icon: Settings,
    color: 'bg-cyan-50 text-cyan-700',
    iconBg: 'bg-cyan-100',
  },
  {
    title: '현장 안돈(Andon)',
    description: '현장 대형 모니터용 실시간 생산 현황 표시',
    href: '/dashboard/andon',
    icon: Monitor,
    color: 'bg-gray-50 text-gray-700',
    iconBg: 'bg-gray-200',
  },
];

export default function DashboardPage() {
  return (
    <div className="pb-6">
      <h4 className="text-lg font-semibold text-gray-900 mb-1">대시보드</h4>
      <p className="text-sm text-gray-500 mb-6">실시간 모니터링 대시보드를 선택하세요.</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {dashboards.map((d) => (
          <Link
            key={d.href}
            href={d.href}
            className="bg-white rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-6 flex items-start gap-5 hover:shadow-md transition-shadow group"
          >
            <div className={`w-12 h-12 rounded-lg ${d.iconBg} flex items-center justify-center shrink-0`}>
              <d.icon className={`w-6 h-6 ${d.color.split(' ')[1]}`} />
            </div>
            <div>
              <h5 className="text-base font-semibold text-gray-900 group-hover:text-blue-700 transition-colors">
                {d.title}
              </h5>
              <p className="text-sm text-gray-500 mt-1">{d.description}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
