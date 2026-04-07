import React from 'react';
import {
  DashboardOutlined,
  DatabaseOutlined,
  ScheduleOutlined,
  FileTextOutlined,
  CheckCircleOutlined,
  ExperimentOutlined,
  ToolOutlined,
  InboxOutlined,
  CarOutlined,
  BarChartOutlined,
  SettingOutlined,
} from '@ant-design/icons';

export interface MenuItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  path: string;
  permission?: string;
  children?: MenuItem[];
}

/**
 * IA 11개 대메뉴 + 서브메뉴 — proposal.md 4-1 기반
 * path는 Next.js App Router route와 1:1 매핑
 */
export const menuConfig: MenuItem[] = [
  {
    id: 'dashboard',
    label: '대시보드',
    icon: <DashboardOutlined />,
    path: '/dashboard',
    permission: 'dashboard:read',
    children: [
      { id: 'dashboard-production', label: '생산종합 대시보드', path: '/dashboard/production', permission: 'dashboard:read' },
      { id: 'dashboard-quality', label: '품질종합 대시보드', path: '/dashboard/quality', permission: 'dashboard:read' },
      { id: 'dashboard-equipment', label: '설비종합 대시보드', path: '/dashboard/equipment', permission: 'dashboard:read' },
      { id: 'dashboard-andon', label: '현장 안돈(Andon)', path: '/dashboard/andon', permission: 'dashboard:read' },
    ],
  },
  {
    id: 'master',
    label: '기준정보',
    icon: <DatabaseOutlined />,
    path: '/master',
    permission: 'master:read',
    children: [
      { id: 'master-item', label: '품목관리', path: '/master/item', permission: 'master:read' },
      { id: 'master-bom', label: 'BOM관리', path: '/master/bom', permission: 'master:read' },
      { id: 'master-process', label: '공정관리', path: '/master/process', permission: 'master:read' },
      { id: 'master-equipment', label: '설비관리', path: '/master/equipment', permission: 'master:read' },
      { id: 'master-workplace', label: '작업장/라인 관리', path: '/master/workplace', permission: 'master:read' },
      { id: 'master-worker', label: '작업자관리', path: '/master/worker', permission: 'master:read' },
      { id: 'master-vendor', label: '거래처관리', path: '/master/vendor', permission: 'master:read' },
      { id: 'master-inspection', label: '검사기준관리', path: '/master/inspection', permission: 'master:read' },
    ],
  },
  {
    id: 'plan',
    label: '생산계획',
    icon: <ScheduleOutlined />,
    path: '/plan',
    permission: 'plan:read',
    children: [
      { id: 'plan-management', label: '생산계획 관리', path: '/plan/management', permission: 'plan:read' },
      { id: 'plan-demand', label: '수요관리', path: '/plan/demand', permission: 'plan:read' },
    ],
  },
  {
    id: 'work-order',
    label: '작업지시',
    icon: <FileTextOutlined />,
    path: '/work-order',
    permission: 'work-order:read',
    children: [
      { id: 'wo-management', label: '작업지시 관리', path: '/work-order/management', permission: 'work-order:read' },
      { id: 'wo-assignment', label: '작업배정', path: '/work-order/assignment', permission: 'work-order:read' },
    ],
  },
  {
    id: 'production',
    label: '생산실적',
    icon: <CheckCircleOutlined />,
    path: '/production',
    permission: 'production:read',
    children: [
      { id: 'prod-result', label: '실적관리', path: '/production/result', permission: 'production:read' },
      { id: 'prod-material', label: '자재투입', path: '/production/material', permission: 'production:read' },
      { id: 'prod-lot', label: 'LOT관리', path: '/production/lot', permission: 'production:read' },
    ],
  },
  {
    id: 'quality',
    label: '품질관리',
    icon: <ExperimentOutlined />,
    path: '/quality',
    permission: 'quality:read',
    children: [
      { id: 'qc-incoming', label: '수입검사', path: '/quality/incoming', permission: 'quality:read' },
      { id: 'qc-process', label: '공정검사', path: '/quality/process', permission: 'quality:read' },
      { id: 'qc-shipping', label: '출하검사', path: '/quality/shipping', permission: 'quality:read' },
      { id: 'qc-defect', label: '불량관리', path: '/quality/defect', permission: 'quality:read' },
      { id: 'qc-spc', label: 'SPC', path: '/quality/spc', permission: 'quality:read' },
    ],
  },
  {
    id: 'equipment',
    label: '설비보전',
    icon: <ToolOutlined />,
    path: '/equipment',
    permission: 'equipment:read',
    children: [
      { id: 'equip-operation', label: '설비가동관리', path: '/equipment/operation', permission: 'equipment:read' },
      { id: 'equip-preventive', label: '예방보전', path: '/equipment/preventive', permission: 'equipment:read' },
      { id: 'equip-mold', label: '금형관리', path: '/equipment/mold', permission: 'equipment:read' },
    ],
  },
  {
    id: 'inventory',
    label: '자재/재고',
    icon: <InboxOutlined />,
    path: '/inventory',
    permission: 'inventory:read',
    children: [
      { id: 'inv-issue', label: '자재불출', path: '/inventory/issue', permission: 'inventory:read' },
      { id: 'inv-stock', label: '재고관리', path: '/inventory/stock', permission: 'inventory:read' },
      { id: 'inv-receiving', label: '입고관리', path: '/inventory/receiving', permission: 'inventory:read' },
    ],
  },
  {
    id: 'shipment',
    label: '출하관리',
    icon: <CarOutlined />,
    path: '/shipment',
    permission: 'shipment:read',
    children: [
      { id: 'ship-order', label: '출하지시', path: '/shipment/order', permission: 'shipment:read' },
      { id: 'ship-process', label: '출하처리', path: '/shipment/process', permission: 'shipment:read' },
    ],
  },
  {
    id: 'reports',
    label: '리포트',
    icon: <BarChartOutlined />,
    path: '/reports',
    permission: 'reports:read',
    children: [
      { id: 'rpt-production', label: '생산 리포트', path: '/reports/production', permission: 'reports:read' },
      { id: 'rpt-quality', label: '품질 리포트', path: '/reports/quality', permission: 'reports:read' },
      { id: 'rpt-equipment', label: '설비 리포트', path: '/reports/equipment', permission: 'reports:read' },
      { id: 'rpt-inventory', label: '재고 리포트', path: '/reports/inventory', permission: 'reports:read' },
      { id: 'rpt-kpi', label: '종합 KPI', path: '/reports/kpi', permission: 'reports:read' },
    ],
  },
  {
    id: 'system',
    label: '시스템관리',
    icon: <SettingOutlined />,
    path: '/system',
    permission: 'system:admin',
    children: [
      { id: 'sys-users', label: '사용자관리', path: '/system/users', permission: 'system:admin' },
      { id: 'sys-roles', label: '권한관리', path: '/system/roles', permission: 'system:admin' },
      { id: 'sys-codes', label: '공통코드관리', path: '/system/codes', permission: 'system:admin' },
      { id: 'sys-notifications', label: '알림관리', path: '/system/notifications', permission: 'system:admin' },
      { id: 'sys-settings', label: '시스템 설정', path: '/system/settings', permission: 'system:admin' },
      { id: 'sys-logs', label: '로그관리', path: '/system/logs', permission: 'system:admin' },
      { id: 'sys-notice', label: '공지사항', path: '/system/notice', permission: 'system:admin' },
    ],
  },
];

/**
 * 메뉴 설정에서 경로 → 라벨 매핑 생성 (Breadcrumb 용)
 * 키: full path (e.g. '/dashboard/quality')
 */
export function buildPathToLabelMap(items: MenuItem[], map: Record<string, string> = {}): Record<string, string> {
  for (const item of items) {
    map[item.path] = item.label;
    if (item.children) {
      buildPathToLabelMap(item.children, map);
    }
  }
  return map;
}

/** full path → label map (캐시) */
export const pathToLabelMap = buildPathToLabelMap(menuConfig);

/**
 * 경로 세그먼트 → 라벨 매핑 (legacy, 단순 세그먼트 기반)
 * 주의: 동일 세그먼트가 다른 경로에 존재하면 마지막 등록이 우선
 */
export function buildPathLabelMap(items: MenuItem[], map: Record<string, string> = {}): Record<string, string> {
  for (const item of items) {
    const segments = item.path.split('/').filter(Boolean);
    const lastSegment = segments[segments.length - 1];
    if (lastSegment && !map[lastSegment]) {
      map[lastSegment] = item.label;
    }
    if (item.children) {
      buildPathLabelMap(item.children, map);
    }
  }
  return map;
}

/** 세그먼트 → label flat map (최초 등록 우선) */
export const pathLabelMap = buildPathLabelMap(menuConfig);

/**
 * menuConfig → Ant Design Menu items 변환
 */
export function toAntdMenuItems(items: MenuItem[]): Array<{
  key: string;
  icon?: React.ReactNode;
  label: string;
  children?: Array<{ key: string; label: string }>;
}> {
  return items.map((item) => ({
    key: item.path,
    icon: item.icon,
    label: item.label,
    children: item.children?.map((child) => ({
      key: child.path,
      label: child.label,
    })),
  }));
}
