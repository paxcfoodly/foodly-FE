import apiClient from './apiClient';
import type { ApiResponse } from '@/types';

/** 알림 항목 (BE TbNotification) */
export interface NotificationItem {
  noti_id: number;
  noti_type: string | null;
  noti_title: string;
  noti_content: string | null;
  read_yn: string; // 'Y' | 'N'
  create_dt: string;
}

/** GET /v1/notifications — 내 알림함 */
export async function listNotificationsApi(limit = 50): Promise<NotificationItem[]> {
  const res = await apiClient.get<ApiResponse<NotificationItem[]>>('/v1/notifications', {
    params: { limit },
  });
  return res.data.data ?? [];
}

/** GET /v1/notifications/unread-count */
export async function unreadCountApi(): Promise<number> {
  const res = await apiClient.get<ApiResponse<{ count: number }>>('/v1/notifications/unread-count');
  return res.data.data?.count ?? 0;
}

/** PATCH /v1/notifications/:id/read */
export async function markNotificationReadApi(notiId: number): Promise<void> {
  await apiClient.patch(`/v1/notifications/${notiId}/read`);
}

/** PATCH /v1/notifications/read-all */
export async function markAllNotificationsReadApi(): Promise<void> {
  await apiClient.patch('/v1/notifications/read-all');
}

/** POST /v1/auth/change-password */
export async function changePasswordApi(currentPassword: string, newPassword: string): Promise<void> {
  await apiClient.post('/v1/auth/change-password', {
    current_password: currentPassword,
    new_password: newPassword,
  });
}
