import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import SubscriptionClient from "./SubscriptionClient";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default async function SubscriptionPage() {
  const pbUrl = process.env.NEXT_PUBLIC_PB_URL || process.env.NEXT_PUBLIC_POCKETBASE_URL || 'http://127.0.0.1:8090';

  interface MenuItem { id: string; name: string; price: number; image_url?: string; }
  let menuItems: MenuItem[] = [];
  try {
    const res = await fetch(`${pbUrl}/api/collections/menu_items/records?filter=(is_active=1)&sort=name&perPage=500`, { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      menuItems = data.items || [];
    }
  } catch (e) {
    console.error("Pocketbase fetch error", e);
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
