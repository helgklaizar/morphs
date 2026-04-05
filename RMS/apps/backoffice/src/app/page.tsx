"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function RootRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/dashboard");
  }, [router]);

  return <div className="p-10 text-muted-foreground flex items-center justify-center min-h-screen">Загрузка приложения...</div>;
}
