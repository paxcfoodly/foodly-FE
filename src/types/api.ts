/**
 * 공통 API 응답/요청 타입 정의
 */

/** 표준 API 응답 래퍼 */
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  code?: string;
}

/** 페이지네이션 메타 정보 */
export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

/** 페이지네이션 응답 래퍼 */
export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: PaginationMeta;
  message?: string;
}

/** 페이지네이션 요청 파라미터 */
export interface PaginationParams {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/** 셀렉트/드롭다운 옵션 */
export interface SelectOption<V = string> {
  label: string;
  value: V;
  disabled?: boolean;
}

/** 트리 셀렉트 옵션 (메뉴, 카테고리 등) */
export interface TreeSelectOption<V = string> extends SelectOption<V> {
  children?: TreeSelectOption<V>[];
}

/** API 에러 응답 */
export interface ApiError {
  success: false;
  message: string;
  code?: string;
  errors?: Record<string, string[]>;
}
