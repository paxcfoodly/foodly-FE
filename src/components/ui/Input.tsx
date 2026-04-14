'use client';

import React, { forwardRef } from 'react';

export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'prefix'> {
  allowClear?: boolean;
  onClear?: () => void;
  addonBefore?: React.ReactNode;
  addonAfter?: React.ReactNode;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className = '', allowClear, onClear, addonBefore, addonAfter, ...rest }, ref) => {
    return (
      <div className="relative flex items-center">
        {addonBefore && (
          <span className="absolute left-3 text-gray-400 pointer-events-none">{addonBefore}</span>
        )}
        <input
          ref={ref}
          className={`
            w-full h-9 bg-dark-700 border border-dark-500 rounded-lg text-sm text-gray-700
            placeholder-gray-400 transition-all
            focus:outline-none focus:bg-white focus:border-cyan-accent focus:ring-2 focus:ring-cyan-accent/15
            disabled:opacity-50 disabled:cursor-not-allowed
            ${addonBefore ? 'pl-9' : 'pl-3'} ${addonAfter || allowClear ? 'pr-9' : 'pr-3'}
            ${className}
          `}
          {...rest}
        />
        {addonAfter && (
          <span className="absolute right-3 text-gray-400">{addonAfter}</span>
        )}
      </div>
    );
  },
);

Input.displayName = 'Input';
export default Input;

/* Textarea */
export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className = '', ...rest }, ref) => {
    return (
      <textarea
        ref={ref}
        className={`
          w-full bg-dark-700 border border-dark-500 rounded-lg px-3 py-2 text-sm text-gray-700
          placeholder-gray-400 transition-all
          focus:outline-none focus:bg-white focus:border-cyan-accent focus:ring-2 focus:ring-cyan-accent/15
          disabled:opacity-50 disabled:cursor-not-allowed
          ${className}
        `}
        {...rest}
      />
    );
  },
);

Textarea.displayName = 'Textarea';
