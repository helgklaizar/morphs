'use client';

import { useEffect, useState } from 'react';
import { useToastStore } from '@rms/core';
import type { Toast, ToastType } from '@rms/core';

const icons: Record<ToastType, string> = {
  success: '✅',
  error: '❌',
  warning: '⚠️',
  info: 'ℹ️',
};

const colors: Record<ToastType, string> = {
  success: 'border-green-600 bg-green-600 text-white',
  error: 'border-red-600 bg-red-600 text-white',
  warning: 'border-amber-600 bg-amber-600 text-white',
  info: 'border-blue-600 bg-blue-600 text-white',
};

function ToastItem({ toast }: { toast: Toast }) {
  const dismiss = useToastStore((s) => s.dismiss);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Animate in
    requestAnimationFrame(() => setVisible(true));
  }, []);

  return (
    <div
      className={`
        flex items-start gap-3 px-4 py-3 rounded-xl border backdrop-blur-sm
        shadow-lg text-sm font-medium transition-all duration-300
        ${colors[toast.type]}
        ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}
      `}
    >
      <span className="text-base leading-none mt-0.5">{icons[toast.type]}</span>
      <span className="flex-1 leading-snug">{toast.message}</span>
      <button
        onClick={() => dismiss(toast.id)}
        className="opacity-50 hover:opacity-100 transition-opacity text-xs leading-none mt-0.5"
      >
        ✕
      </button>
    </div>
  );
}

export function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts);

  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-2 w-80 pointer-events-none">
      {toasts.map((t) => (
        <div key={t.id} className="pointer-events-auto">
          <ToastItem toast={t} />
        </div>
      ))}
    </div>
  );
}
