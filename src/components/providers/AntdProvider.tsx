'use client';

import { ConfigProvider, App } from 'antd';
import koKR from 'antd/locale/ko_KR';
import { foodlyTheme } from '@/lib/theme';

export default function AntdProvider({ children }: { children: React.ReactNode }) {
  return (
    <ConfigProvider theme={foodlyTheme} locale={koKR}>
      <App>{children}</App>
    </ConfigProvider>
  );
}
