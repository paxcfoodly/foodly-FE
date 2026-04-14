'use client';

import React from 'react';
import { AlertCircle, CheckCircle, Info, AlertTriangle, X } from 'lucide-react';

interface AlertProps {
  type?: 'success' | 'error' | 'warning' | 'info';
  message: React.ReactNode;
  description?: React.ReactNode;
  closable?: boolean;
  onClose?: () => void;
  className?: string;
  showIcon?: boolean;
}

const config: Record<string, { icon: React.ReactNode; bg: string; border: string; text: string }> = {
  success: { icon: <CheckCircle className="w-5 h-5" />, bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-700' },
  error: { icon: <AlertCircle className="w-5 h-5" />, bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700' },
  warning: { icon: <AlertTriangle className="w-5 h-5" />, bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-700' },
  info: { icon: <Info className="w-5 h-5" />, bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700' },
};

export default function Alert({ type = 'info', message, description, closable, onClose, className = '', showIcon = true }: AlertProps) {
  const c = config[type];
  return (
    <div className={`flex items-start gap-3 p-4 rounded-lg border ${c.bg} ${c.border} ${className}`}>
      {showIcon && <span className={`shrink-0 mt-0.5 ${c.text}`}>{c.icon}</span>}
      <div className="flex-1 min-w-0">
        <div className={`text-sm font-medium ${c.text}`}>{message}</div>
        {description && <div className="text-sm text-gray-600 mt-1">{description}</div>}
      </div>
      {closable && (
        <button onClick={onClose} className="shrink-0 text-gray-400 hover:text-gray-600">
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
