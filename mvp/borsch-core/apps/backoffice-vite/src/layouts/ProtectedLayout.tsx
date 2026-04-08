import { Outlet } from "react-router-dom";
import { TopHeader } from "@/components/TopHeader";

export default function ProtectedLayout() {
  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <TopHeader />
      <main className="flex-1 overflow-hidden relative p-4 lg:p-8">
        <Outlet />
      </main>
    </div>
  );
}
