'use client';

import React, { useState, useCallback } from 'react';
import { Search, RotateCcw } from 'lucide-react';
import dayjs, { type Dayjs } from 'dayjs';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import type { DataGridColumn } from '@/components/common/DataGrid';
import DataGrid from '@/components/common/DataGrid';
import StatusTogglePopover from '@/components/equipment/StatusTogglePopover';
import StatusTimelineChart from '@/components/equipment/StatusTimelineChart';
import apiClient from '@/lib/apiClient';

const STATUS_COLORS: Record<string, string> = {
  RUN: '#52c41a',
  IDLE: '#fa8c16',
  DOWN: '#ff4d4f',
  SETUP: '#faad14',
};

const STATUS_LABELS: Record<string, string> = {
  RUN: '가동',
  IDLE: '비가동',
  DOWN: '고장',
  SETUP: '점검',
};

const STATUS_BADGE: Record<string, 'success' | 'warning' | 'error' | 'processing' | 'default'> = {
  RUN: 'success',
  IDLE: 'warning',
  DOWN: 'error',
  SETUP: 'warning',
};

interface EquipStatus {
  status_id: number | string;
  status_type: string;
  down_reason_cd?: string;
  start_dt: string;
  end_dt?: string;
  duration?: number;
  memo?: string;
}

interface EquipmentRow {
  equip_cd: string;
  equip_nm: string;
  equip_type?: string;
  equip_statuses: EquipStatus[];
  [key: string]: unknown;
}

interface StatusHistoryRow {
  status_id: number | string;
  equip_cd: string;
  status_type: string;
  down_reason_cd?: string;
  start_dt: string;
  end_dt?: string;
  duration?: number;
  memo?: string;
  equipment?: { equip_nm: string };
  [key: string]: unknown;
}

export default function EquipmentOperationPage() {
  const today = dayjs();
  const [startDate, setStartDate] = useState(today.format('YYYY-MM-DD'));
  const [endDate, setEndDate] = useState(today.format('YYYY-MM-DD'));
  const [equipList, setEquipList] = useState<EquipmentRow[]>([]);
  const [equipLoading, setEquipLoading] = useState(false);
  const [selectedEquip, setSelectedEquip] = useState<EquipmentRow | null>(null);
  const [historyList, setHistoryList] = useState<StatusHistoryRow[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [total, setTotal] = useState<number | undefined>(undefined);

  const fetchEquipList = useCallback(async () => {
    setEquipLoading(true);
    try {
      const res = await apiClient.get('/v1/equip-statuses/equipment-list', {
        params: { page, pageSize },
      });
      const data = res.data.data;
      setEquipList(data?.items ?? data ?? []);
      if (data?.total !== undefined) setTotal(data.total);
    } catch {
      setEquipList([]);
    } finally {
      setEquipLoading(false);
    }
  }, [page, pageSize]);

  const fetchHistory = useCallback(async (equipCd: string) => {
    setHistoryLoading(true);
    try {
      const res = await apiClient.get('/v1/equip-statuses', {
        params: {
          equip_cd: equipCd,
          start_dt_from: startDate,
          start_dt_to: endDate,
        },
      });
      const data = res.data.data;
      setHistoryList(data?.items ?? data ?? []);
    } catch {
      setHistoryList([]);
    } finally {
      setHistoryLoading(false);
    }
  }, [startDate, endDate]);

  const handleSearch = () => {
    setPage(1);
    fetchEquipList();
  };

  const handleReset = () => {
    setStartDate(today.format('YYYY-MM-DD'));
    setEndDate(today.format('YYYY-MM-DD'));
    setPage(1);
    setEquipList([]);
    setSelectedEquip(null);
    setHistoryList([]);
  };

  const handleRowClick = (record: EquipmentRow) => {
    setSelectedEquip(record);
    fetchHistory(record.equip_cd);
  };

  const equipColumns: DataGridColumn<EquipmentRow>[] = [
    { title: '설비코드', dataIndex: 'equip_cd', width: 120 },
    { title: '설비명', dataIndex: 'equip_nm', width: 180, ellipsis: true },
    {
      title: '현재상태',
      dataIndex: 'equip_statuses',
      width: 100,
      render: (_, record) => {
        const current = record.equip_statuses?.[0];
        if (!current) return <Badge status="default" text="-" />;
        return (
          <Badge
            status={STATUS_BADGE[current.status_type] ?? 'default'}
            text={STATUS_LABELS[current.status_type] ?? current.status_type}
          />
        );
      },
    },
    {
      title: '최근 변경시각',
      dataIndex: 'equip_statuses',
      width: 160,
      render: (_, record) => {
        const current = record.equip_statuses?.[0];
        if (!current?.start_dt) return '-';
        return new Date(current.start_dt).toLocaleString('ko-KR');
      },
    },
    {
      title: '비가동사유',
      dataIndex: 'equip_statuses',
      width: 120,
      render: (_, record) => {
        const current = record.equip_statuses?.[0];
        return current?.down_reason_cd ?? '-';
      },
    },
    {
      title: '상태변경',
      dataIndex: 'equip_cd',
      width: 120,
      align: 'center',
      render: (_, record) => (
        <StatusTogglePopover
          equipCd={record.equip_cd}
          currentStatus={record.equip_statuses?.[0]?.status_type}
          onSuccess={fetchEquipList}
        />
      ),
    },
  ];

  const historyColumns: DataGridColumn<StatusHistoryRow>[] = [
    {
      title: '상태',
      dataIndex: 'status_type',
      width: 100,
      render: (val) => {
        const v = val as string;
        return <Badge status={STATUS_BADGE[v] ?? 'default'} text={STATUS_LABELS[v] ?? v} />;
      },
    },
    {
      title: '시작시간',
      dataIndex: 'start_dt',
      width: 160,
      render: (val) => (val ? new Date(val as string).toLocaleString('ko-KR') : '-'),
    },
    {
      title: '종료시간',
      dataIndex: 'end_dt',
      width: 160,
      render: (val) => (val ? new Date(val as string).toLocaleString('ko-KR') : '진행 중'),
    },
    {
      title: '소요시간',
      dataIndex: 'duration',
      width: 100,
      render: (val) => (val != null ? `${val}분` : '-'),
    },
    { title: '비가동사유', dataIndex: 'down_reason_cd', width: 120, render: (val) => (val as string) ?? '-' },
    { title: '메모', dataIndex: 'memo', ellipsis: true, render: (val) => (val as string) ?? '-' },
  ];

  return (
    <div className="pb-6">
      <h4 className="text-lg font-semibold mb-4">설비가동관리</h4>

      {/* Filter bar */}
      <div className="bg-white rounded-xl p-4 shadow-sm mb-4">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm">조회 기간:</span>
          <input
            type="date"
            className="h-9 bg-dark-700 border border-dark-500 rounded-lg px-3 text-sm text-gray-700 transition-all focus:outline-none focus:bg-white focus:border-cyan-accent focus:ring-2 focus:ring-cyan-accent/15"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
          <span className="text-gray-400 text-xs">~</span>
          <input
            type="date"
            className="h-9 bg-dark-700 border border-dark-500 rounded-lg px-3 text-sm text-gray-700 transition-all focus:outline-none focus:bg-white focus:border-cyan-accent focus:ring-2 focus:ring-cyan-accent/15"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
          <Button variant="primary" icon={<Search className="w-4 h-4" />} onClick={handleSearch}>
            검색
          </Button>
          <Button icon={<RotateCcw className="w-4 h-4" />} onClick={handleReset}>
            초기화
          </Button>
        </div>
      </div>

      {/* Equipment list */}
      <div className="bg-white rounded-xl p-4 shadow-sm mb-4">
        <DataGrid<EquipmentRow> storageKey="equipment-operation-list"
          columns={equipColumns}
          dataSource={equipList}
          rowKey="equip_cd"
          loading={equipLoading}
          total={total}
          page={page}
          pageSize={pageSize}
          onPageChange={(p, ps) => {
            setPage(p);
            setPageSize(ps);
            fetchEquipList();
          }}
          emptyText="등록된 설비가 없습니다. 설비 마스터에서 설비를 먼저 등록해주세요."
          scrollX={800}
          onRow={(record) => ({
            onClick: () => handleRowClick(record),
            style: {
              cursor: 'pointer',
              background: selectedEquip?.equip_cd === record.equip_cd ? '#e6f7ff' : undefined,
            },
          })}
        />
      </div>

      {/* Status history panel */}
      {selectedEquip && (
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <h3 className="text-base font-semibold text-gray-900 mb-3">
            {selectedEquip.equip_nm} ({selectedEquip.equip_cd}) 상태 이력
          </h3>
          <div className="mb-3">
            <StatusTimelineChart
              equipCd={selectedEquip.equip_cd}
              equipNm={selectedEquip.equip_nm}
              startDate={startDate}
              endDate={endDate}
            />
          </div>
          <DataGrid<StatusHistoryRow> storageKey="equipment-operation-history"
            columns={historyColumns}
            dataSource={historyList}
            rowKey="status_id"
            loading={historyLoading}
            emptyText="이 설비의 상태 이력이 없습니다. 설비 상태를 변경하면 이력이 자동으로 기록됩니다."
            scrollX={800}
          />
        </div>
      )}
    </div>
  );
}
