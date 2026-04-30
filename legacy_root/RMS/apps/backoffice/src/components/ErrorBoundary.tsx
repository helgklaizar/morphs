"use client";

import React, { Component, ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);

    // Get PocketBase URL, defaults appropriately
    const pbUrl = process.env.NEXT_PUBLIC_POCKETBASE_URL || "http://127.0.0.1:8090";

    // Send crash report to PocketBase
    fetch(`${pbUrl}/api/monitor/logs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        deviceId: "POS-Mac", // This can be dynamic in a real app
        error: error.message,
        componentStack: errorInfo.componentStack,
      }),
    }).catch((apiError) => {
      console.error("Failed to send error to monitor API", apiError);
    });
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center p-4 bg-gray-50 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100">
          <div className="max-w-md bg-white dark:bg-zinc-800 p-8 rounded-xl shadow-lg border border-red-500/20">
            <h1 className="text-2xl font-bold text-red-500 mb-4">🚨 Критическая ошибка интерфейса</h1>
            <p className="mb-4 text-sm text-zinc-600 dark:text-zinc-400">
              Приложение столкнулось с неожиданной ошибкой. Отчет о падении уже был автоматически отправлен в Telegram. 
            </p>
            <div className="bg-red-50 dark:bg-red-900/10 p-4 rounded text-xs text-red-600 dark:text-red-400 overflow-x-auto mb-6 whitespace-pre-wrap">
              {this.state.error?.message}
            </div>
            <button
              onClick={() => window.location.reload()}
              className="w-full py-2 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded font-medium hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-colors"
            >
              Перезагрузить приложение
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
