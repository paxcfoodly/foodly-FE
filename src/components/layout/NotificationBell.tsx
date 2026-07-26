'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Bell, CheckCheck, Package, AlertTriangle, ClipboardList, Info } from 'lucide-react';
import { Badge, toast } from '@/components/ui';
import {
  listNotificationsApi,
  unreadCountApi,
  markNotificationReadApi,
  markAllNotificationsReadApi,
  type NotificationItem,
} from '@/lib/notificationApi';

const POLL_INTERVAL = 60_000; // 60초마다 미읽음 수 갱신

function typeIcon(type: string | null) {
  switch (type) {
    case 'SHIPMENT': return <Package className="w-4 h-4 text-cyan-accent" />;
    case 'DEFECT': return <AlertTriangle className="w-4 h-4 text-red-accent" />;
    case 'WORK_ORDER': return <ClipboardList className="w-4 h-4 text-blue-accent" />;
    default: return <Info className="w-4 h-4 text-gray-400" />;
  }
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60_000);
  if (min < 1) return '방금';
  if (min < 60) return `${min}분 전`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}시간 전`;
  return `${Math.floor(hr / 24)}일 전`;
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const refreshCount = useCallback(async () => {
    try {
      setUnread(await unreadCountApi());
    } catch {
      // 로그인 전/네트워크 오류는 조용히 무시
    }
  }, []);

  // 미읽음 수 폴링
  useEffect(() => {
    refreshCount();
    const id = setInterval(refreshCount, POLL_INTERVAL);
    return () => clearInterval(id);
  }, [refreshCount]);

  // 바깥 클릭 시 닫기
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const loadList = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await listNotificationsApi(30));
    } catch {
      toast.error('알림을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, []);

  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (next) loadList();
  };

  const handleItemClick = async (item: NotificationItem) => {
    if (item.read_yn === 'Y') return;
    try {
      await markNotificationReadApi(item.noti_id);
      setItems((prev) => prev.map((n) => (n.noti_id === item.noti_id ? { ...n, read_yn: 'Y' } : n)));
      setUnread((c) => Math.max(0, c - 1));
    } catch {
      toast.error('읽음 처리에 실패했습니다.');
    }
  };

  const handleMarkAll = async () => {
    try {
      await markAllNotificationsReadApi();
      setItems((prev) => prev.map((n) => ({ ...n, read_yn: 'Y' })));
      setUnread(0);
      toast.success('모든 알림을 읽음 처리했습니다.');
    } catch {
      toast.error('처리에 실패했습니다.');
    }
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={toggle}
        className="relative p-2 rounded-lg hover:bg-dark-700 transition-colors"
        aria-label="알림"
      >
        <Badge count={unread} size="small">
          <Bell className="w-5 h-5 text-gray-500" />
        </Badge>
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 max-w-[calc(100vw-2rem)] bg-dark-800 border border-dark-500 rounded-xl shadow-xl z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-dark-500">
            <span className="text-sm font-semibold text-gray-900">
              알림 {unread > 0 && <span className="text-cyan-accent">({unread})</span>}
            </span>
            {unread > 0 && (
              <button
                onClick={handleMarkAll}
                className="flex items-center gap-1 text-xs text-dark-400 hover:text-cyan-accent transition-colors"
              >
                <CheckCheck className="w-3.5 h-3.5" /> 모두 읽음
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="px-4 py-8 text-center text-sm text-dark-400">불러오는 중…</div>
            ) : items.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-dark-400">알림이 없습니다.</div>
            ) : (
              items.map((item) => (
                <button
                  key={item.noti_id}
                  onClick={() => handleItemClick(item)}
                  className={`w-full flex items-start gap-3 px-4 py-3 text-left border-b border-dark-700 last:border-0 hover:bg-dark-700 transition-colors ${
                    item.read_yn === 'N' ? 'bg-dark-700/40' : ''
                  }`}
                >
                  <div className="mt-0.5 shrink-0">{typeIcon(item.noti_type)}</div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      {item.read_yn === 'N' && (
                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-accent shrink-0" />
                      )}
                      <span className={`text-sm truncate ${item.read_yn === 'N' ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>
                        {item.noti_title}
                      </span>
                    </div>
                    {item.noti_content && (
                      <p className="text-xs text-dark-400 mt-0.5 line-clamp-2">{item.noti_content}</p>
                    )}
                    <span className="text-[11px] text-dark-500 mt-1 block">{timeAgo(item.create_dt)}</span>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
