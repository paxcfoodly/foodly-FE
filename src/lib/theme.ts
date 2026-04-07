import type { ThemeConfig } from 'antd';

/**
 * Foodly MES 테마 설정
 * 제조현장 고대비 UI를 고려한 색상/타이포그래피 구성
 */
export const foodlyTheme: ThemeConfig = {
  token: {
    // 브랜드 색상 — 식품 제조 산업에 적합한 블루-그린 계열
    colorPrimary: '#1677ff',
    colorSuccess: '#52c41a',
    colorWarning: '#faad14',
    colorError: '#ff4d4f',
    colorInfo: '#1677ff',

    // 타이포그래피 — 제조현장 고대비 가독성
    fontSize: 14,
    fontFamily:
      "'Pretendard Variable', Pretendard, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",

    // 레이아웃
    borderRadius: 6,
    wireframe: false,
  },
  components: {
    Layout: {
      headerBg: '#001529',
      headerHeight: 56,
      siderBg: '#001529',
      bodyBg: '#f0f2f5',
      footerBg: '#f0f2f5',
    },
    Menu: {
      darkItemBg: '#001529',
      darkSubMenuItemBg: '#000c17',
      darkItemSelectedBg: '#1677ff',
      itemHeight: 44,
      iconSize: 18,
    },
    Button: {
      controlHeight: 36,
    },
    Table: {
      headerBg: '#fafafa',
      rowHoverBg: '#e6f7ff',
    },
  },
};
