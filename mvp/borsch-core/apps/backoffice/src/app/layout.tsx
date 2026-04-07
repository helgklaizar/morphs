import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { TooltipProvider } from "@/components/ui/tooltip";
import ErrorBoundary from "@/components/ErrorBoundary";

const inter = Inter({ subsets: ["latin", "cyrillic"] });

export const metadata: Metadata = {
  title: "RMS AI OS Backoffice",
  description: "Tauri + Next.js Desktop backoffice replacing Flutter",
};

import { QueryProvider } from "@rms/core";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" className="dark" suppressHydrationWarning>
      <body className={`${inter.className} antialiased bg-background text-foreground`}>
        <QueryProvider>
          <ErrorBoundary>
            <TooltipProvider>{children}</TooltipProvider>
          </ErrorBoundary>
        </QueryProvider>
      </body>
    </html>
  );
}
