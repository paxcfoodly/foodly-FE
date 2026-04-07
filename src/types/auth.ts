/**
 * 인증 관련 타입 정의
 */

/** 로그인한 사용자 정보 (BE LoginResult.user 형태) */
export interface User {
  userId: number;
  loginId: string;
  userNm: string;
  roleCd: string | null;
  roleNm: string | null;
  companyCd: string | null;
}

/** 로그인 요청 */
export interface LoginRequest {
  login_id: string;
  password: string;
}

/** 로그인 응답 data 필드 */
export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

/** /auth/me 응답 data 필드 */
export interface UserProfile extends User {
  status: string;
  permissions?: PermissionItem[];
}

/** 권한 항목 (BE MenuPermission 형태) */
export interface PermissionItem {
  menuId: number;
  menuNm: string;
  menuUrl: string | null;
  canRead: boolean;
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  canPrint: boolean;
}
