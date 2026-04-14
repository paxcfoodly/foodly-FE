'use client';

/**
 * 안돈(Andon) 모드 — 전체화면 레이아웃
 * 사이드바/헤더 없이 모니터 전체를 사용하는 현장 디스플레이용
 */
export default function AndonLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-black">
      <div className="p-4 bg-black text-white text-lg">
        {children}
      </div>
    </div>
  );
}
