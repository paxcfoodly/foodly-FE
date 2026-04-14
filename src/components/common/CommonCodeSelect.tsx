'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import Select from '@/components/ui/Select';
import type { SelectOption } from '@/components/ui/Select';
import toast from '@/components/ui/toast';
import apiClient from '@/lib/apiClient';
import type { ApiResponse } from '@/types';

/* ── Types ─────────────────────────────────────────── */

interface CodeItem {
  code: string;
  code_nm: string;
  sort_order: number;
  use_yn: string;
}

export interface CommonCodeSelectProps
  extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
  /** 공통코드 그룹 코드 */
  groupCd: string;
  /** '전체' 옵션 추가 여부 (기본 false) */
  showAll?: boolean;
  /** '전체' 라벨 (기본 '전체') */
  allLabel?: string;
  /** 비활성 코드 포함 여부 (기본 false) */
  includeInactive?: boolean;
  /** placeholder */
  placeholder?: string;
}

/* ── FE-side cache (per groupCd) ───────────────────── */
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 min
const cache = new Map<string, { data: CodeItem[]; timestamp: number }>();

function getCached(groupCd: string): CodeItem[] | null {
  const entry = cache.get(groupCd);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
    cache.delete(groupCd);
    return null;
  }
  return entry.data;
}

function setCache(groupCd: string, data: CodeItem[]) {
  cache.set(groupCd, { data, timestamp: Date.now() });
}

/** 캐시 수동 무효화 (외부에서 호출 가능) */
export function invalidateCommonCodeCache(groupCd?: string) {
  if (groupCd) {
    cache.delete(groupCd);
  } else {
    cache.clear();
  }
}

/* ── Component ─────────────────────────────────────── */

export default function CommonCodeSelect({
  groupCd,
  showAll = false,
  allLabel = '전체',
  includeInactive = false,
  placeholder,
  ...restProps
}: CommonCodeSelectProps) {
  const [options, setOptions] = useState<SelectOption[]>([]);
  const [loading, setLoading] = useState(false);
  const mountedRef = useRef(true);

  const buildOptions = useCallback(
    (codes: CodeItem[]) => {
      let filtered = codes;
      if (!includeInactive) {
        filtered = codes.filter((c) => c.use_yn === 'Y');
      }

      const opts: SelectOption[] = filtered.map((c) => ({
        label: c.code_nm,
        value: c.code,
      }));

      if (showAll) {
        opts.unshift({ label: allLabel, value: '' });
      }

      setOptions(opts);
    },
    [includeInactive, showAll, allLabel],
  );

  const fetchCodes = useCallback(async () => {
    if (!groupCd) return;

    // 캐시 히트
    const cached = getCached(groupCd);
    if (cached) {
      buildOptions(cached);
      return;
    }

    setLoading(true);
    try {
      const res = await apiClient.get<ApiResponse<CodeItem[]>>(
        `/v1/common-codes/${groupCd}`,
      );
      const codes = res.data.data ?? [];
      setCache(groupCd, codes);
      if (mountedRef.current) {
        buildOptions(codes);
      }
    } catch {
      if (mountedRef.current) {
        toast.error(`공통코드(${groupCd}) 조회 실패`);
        setOptions([]);
      }
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [groupCd, buildOptions]);

  useEffect(() => {
    mountedRef.current = true;
    fetchCodes();
    return () => {
      mountedRef.current = false;
    };
  }, [fetchCodes]);

  return (
    <Select
      placeholder={placeholder ?? '선택'}
      disabled={loading || restProps.disabled}
      options={options}
      {...restProps}
    />
  );
}
