import apiClient from './apiClient';
import type { ApiResponse, LoginRequest, LoginResponse, PermissionItem } from '@/types';

/** POST /v1/auth/login */
export async function loginApi(data: LoginRequest): Promise<LoginResponse> {
  const res = await apiClient.post<ApiResponse<LoginResponse>>('/v1/auth/login', data);
  return res.data.data;
}

/** POST /v1/auth/logout */
export async function logoutApi(): Promise<void> {
  await apiClient.post('/v1/auth/logout');
}

/** POST /v1/auth/refresh */
export async function refreshApi(refreshToken: string) {
  const res = await apiClient.post<ApiResponse<LoginResponse>>('/v1/auth/refresh', { refreshToken });
  return res.data.data;
}

/** GET /v1/auth/permissions — 현재 사용자의 역할별 메뉴 권한 목록 */
export async function getPermissionsApi(): Promise<{ roleCd: string; permissions: PermissionItem[] }> {
  const res = await apiClient.get<ApiResponse<{ roleCd: string; loginId: string; permissions: PermissionItem[] }>>(
    '/v1/auth/permissions',
  );
  return res.data.data;
}
