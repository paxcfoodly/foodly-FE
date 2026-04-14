'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import { Button } from '@/components/ui';
import apiClient from '@/lib/apiClient';

interface ItemOption {
  item_cd: string;
  item_nm: string;
}

interface InspectStdOption {
  inspect_std_id: number;
  inspect_item_nm: string;
}

interface SpcFilterFormProps {
  onSearch: (params: {
    inspect_std_id: number;
    subgroup_size: number;
    start_date?: string;
    end_date?: string;
  }) => void;
  loading?: boolean;
}

export default function SpcFilterForm({ onSearch, loading = false }: SpcFilterFormProps) {
  const [items, setItems] = useState<ItemOption[]>([]);
  const [inspectStds, setInspectStds] = useState<InspectStdOption[]>([]);
  const [stdsLoading, setStdsLoading] = useState(false);

  /* Form state */
  const [itemCd, setItemCd] = useState<string>('');
  const [inspectStdId, setInspectStdId] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [subgroupSize, setSubgroupSize] = useState<number>(5);
  const [validationError, setValidationError] = useState<string>('');

  // Fetch items on mount
  useEffect(() => {
    apiClient
      .get<{ data: ItemOption[] }>('/v1/items', { params: { limit: 200 } })
      .then((res) => {
        const data = res.data?.data;
        if (Array.isArray(data)) {
          setItems(data);
        }
      })
      .catch(() => {
        // silently fail — items optional filter
      });
  }, []);

  const handleItemChange = useCallback(
    (value: string) => {
      setItemCd(value);
      setInspectStdId('');
      setInspectStds([]);
      if (!value) return;
      setStdsLoading(true);
      apiClient
        .get<{ data: InspectStdOption[] }>('/v1/spc/inspect-stds', {
          params: { item_cd: value },
        })
        .then((res) => {
          const data = res.data?.data;
          if (Array.isArray(data)) setInspectStds(data);
        })
        .catch(() => {})
        .finally(() => setStdsLoading(false));
    },
    [],
  );

  const handleSearch = useCallback(() => {
    if (!inspectStdId) {
      setValidationError('검사항목을 선택하세요');
      return;
    }
    setValidationError('');
    onSearch({
      inspect_std_id: Number(inspectStdId),
      subgroup_size: subgroupSize ?? 5,
      start_date: startDate || undefined,
      end_date: endDate || undefined,
    });
  }, [inspectStdId, subgroupSize, startDate, endDate, onSearch]);

  return (
    <div className="bg-white p-4 pb-0 mb-4 rounded-md border border-gray-100">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Item select */}
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">품목</label>
          <select
            className="w-full h-9 bg-gray-50 border border-gray-200 rounded-lg px-3 text-sm text-gray-700 focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/15"
            value={itemCd}
            onChange={(e) => handleItemChange(e.target.value)}
          >
            <option value="">품목 선택</option>
            {items.map((i) => (
              <option key={i.item_cd} value={i.item_cd}>
                {i.item_cd} - {i.item_nm}
              </option>
            ))}
          </select>
        </div>

        {/* Inspect standard select */}
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">
            검사항목 <span className="text-red-500">*</span>
          </label>
          <select
            className={`w-full h-9 bg-gray-50 border rounded-lg px-3 text-sm text-gray-700 focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/15 ${validationError ? 'border-red-400' : 'border-gray-200'}`}
            value={inspectStdId}
            onChange={(e) => { setInspectStdId(e.target.value); setValidationError(''); }}
            disabled={stdsLoading}
          >
            <option value="">검사항목 선택</option>
            {inspectStds.map((s) => (
              <option key={s.inspect_std_id} value={s.inspect_std_id}>
                {s.inspect_item_nm}
              </option>
            ))}
          </select>
          {validationError && <p className="text-red-500 text-xs mt-1">{validationError}</p>}
        </div>

        {/* Date range */}
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">기간</label>
          <div className="flex items-center gap-2">
            <input
              type="date"
              className="flex-1 h-9 bg-gray-50 border border-gray-200 rounded-lg px-3 text-sm text-gray-700 focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/15"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              placeholder="시작일"
            />
            <span className="text-gray-400">~</span>
            <input
              type="date"
              className="flex-1 h-9 bg-gray-50 border border-gray-200 rounded-lg px-3 text-sm text-gray-700 focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/15"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              placeholder="종료일"
            />
          </div>
        </div>

        {/* Subgroup size */}
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">
            서브그룹크기 <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            className="w-full h-9 bg-gray-50 border border-gray-200 rounded-lg px-3 text-sm text-gray-700 focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/15"
            min={2}
            max={10}
            value={subgroupSize}
            onChange={(e) => setSubgroupSize(Number(e.target.value))}
          />
        </div>
      </div>
      <div className="flex justify-end py-3">
        <Button
          variant="primary"
          icon={<Search className="w-4 h-4" />}
          onClick={handleSearch}
          loading={loading}
        >
          조회
        </Button>
      </div>
    </div>
  );
}
