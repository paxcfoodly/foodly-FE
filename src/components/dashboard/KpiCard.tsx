'use client';

import React from 'react';
import { TrendingUp, TrendingDown, Minus, type LucideIcon } from 'lucide-react';
import Sparkline from './Sparkline';

interface KpiCardProps {
  title: string;
  value: string | number;
  unit?: string;
  subtitle?: string;
  trend?: { value: number; label?: string };
  icon?: LucideIcon;
  iconColor?: 'blue' | 'green' | 'red' | 'yellow' | 'cyan' | 'purple';
  sparkline?: number[];
  sparklineColor?: string;
  /** 0~100 progress bar value (Option 1 style) */
  progress?: number;
  progressColor?: string;
  onClick?: () => void;
  children?: React.ReactNode;
}

const iconStyles = {
  blue: 'bg-blue-50 text-blue-500',
  green: 'bg-emerald-50 text-emerald-500',
  red: 'bg-rose-50 text-rose-500',
  yellow: 'bg-amber-50 text-amber-500',
  cyan: 'bg-cyan-50 text-cyan-500',
  purple: 'bg-violet-50 text-violet-500',
};

export default function KpiCard({
  title,
  value,
  unit,
  subtitle,
  trend,
  icon: Icon,
  iconColor = 'blue',
  sparkline,
  sparklineColor,
  progress,
  progressColor = '#34d399',
  onClick,
  children,
}: KpiCardProps) {
  return (
    <div
      className={`bg-white px-4 py-3 rounded-xl border border-slate-100 flex flex-col justify-between ${
        onClick ? 'cursor-pointer hover:border-slate-200 transition-colors' : ''
      }`}
      onClick={onClick}
    >
      <div className="flex justify-between items-start">
        <p className="text-xs font-medium text-slate-400">{title}</p>
        {Icon && (
          <div className={`w-7 h-7 rounded-md flex items-center justify-center ${iconStyles[iconColor]}`}>
            <Icon className="w-3.5 h-3.5" />
          </div>
        )}
      </div>
      <div className="mt-1.5">
        <h3 className="text-2xl font-mono font-semibold text-slate-800">
          {value}
          {unit && (
            <span className="text-sm font-sans text-slate-300 ml-0.5">
              {unit}
            </span>
          )}
        </h3>
        {progress !== undefined && (
          <div className="mt-2 w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${Math.min(progress, 100)}%`, backgroundColor: progressColor }}
            />
          </div>
        )}
        {sparkline && sparkline.length > 0 && (
          <div className="mt-1 -mx-1">
            <Sparkline data={sparkline} color={sparklineColor} height={26} />
          </div>
        )}
        <div className="flex items-center justify-between mt-1">
          {subtitle && (
            <p className="text-[10px] text-slate-400 leading-tight">{subtitle}</p>
          )}
          {trend && (
            <span
              className={`text-[10px] font-semibold flex items-center gap-0.5 shrink-0 ml-2 ${
                trend.value > 0
                  ? 'text-emerald-500'
                  : trend.value < 0
                    ? 'text-rose-500'
                    : 'text-slate-300'
              }`}
            >
              {trend.value > 0 ? (
                <TrendingUp className="w-2.5 h-2.5" />
              ) : trend.value < 0 ? (
                <TrendingDown className="w-2.5 h-2.5" />
              ) : (
                <Minus className="w-2.5 h-2.5" />
              )}
              {trend.label ?? `${trend.value > 0 ? '+' : ''}${trend.value}%`}
            </span>
          )}
        </div>
      </div>
      {children && <div className="mt-1.5">{children}</div>}
    </div>
  );
}
