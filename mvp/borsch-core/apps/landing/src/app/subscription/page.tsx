import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import SubscriptionClient from "./SubscriptionClient";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default async function SubscriptionPage() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002/api';

  interface MenuItem { id: string; name: string; price: number; image_url?: string; imageUrl?: string; isActive?: boolean; is_active?: boolean; }
  let menuItems: MenuItem[] = [];
  try {
    const res = await fetch(`${apiUrl}/menu`, { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      menuItems = data.filter((i: any) => i.isActive !== false && i.is_active !== false);
    }
  } catch (e) {
    console.error("API fetch error", e);
  }

  // We will build the client component separately to handle the complex state.
  return (
    <div className="min-h-[100dvh] bg-[#050505] text-white">
       <div className="fixed top-0 left-0 right-0 z-40 bg-black/80 backdrop-blur-md px-4 py-3 flex items-center border-b border-white/10">
         <Link href="/" className="mr-3 w-8 h-8 flex items-center justify-center bg-white/10 rounded-full active:scale-95 transition-all">
           <ChevronLeft className="w-5 h-5" />
         </Link>
         <h1 className="font-bold text-lg">Выгодная подписка</h1>
       </div>
       
       <div className="pt-20 px-4 pb-32 max-w-2xl mx-auto">
         <SubscriptionClient items={menuItems} />
       </div>
    </div>
  );
}

// Since we need interactivity, we will move the actual form to a client component.
// But for now, we can inline it as a client component if we use 'use client'.
// Wait, 'use client' must be at the top of the file. So we have to separate them.
