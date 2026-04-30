import LandingClient from "@/components/LandingClient";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default async function Home() {
  const pbUrl = process.env.NEXT_PUBLIC_PB_URL || process.env.NEXT_PUBLIC_POCKETBASE_URL || 'http://127.0.0.1:8090';

  let menuItems: Record<string, unknown>[] = [];
  let landingSettings: Record<string, unknown> = {};
  let menuCategories: Record<string, unknown>[] = [];
  let systemTranslations: Record<string, unknown>[] = [];

  try {
    const fetchHelper = async (endpoint: string, query: string = '') => {
      const res = await fetch(`${pbUrl}/api/collections/${endpoint}/records${query ? '?' + query : ''}`, { cache: 'no-store' });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    };

    const [itemsRes, settingsRes, categoriesRes, translationsRes] = await Promise.all([
      fetchHelper('menu_items', 'filter=(is_active=1)&sort=name&perPage=500').catch(() => ({ items: [] })),
      fetchHelper('landing_settings', 'perPage=1').catch(() => ({ items: [{}] })),
      fetchHelper('menu_categories', 'sort=order_index&perPage=100').catch(() => ({ items: [] })),
      fetchHelper('translations', 'perPage=500').catch(() => ({ items: [] }))
    ]);
    
    menuItems = (itemsRes?.items || []).map((item: any) => ({
      ...item,
      image_url: item.image ? `${pbUrl}/api/files/${item.collectionId}/${item.id}/${item.image}` : (item.image_url || '')
    }));
    landingSettings = settingsRes?.items?.[0] || {};
    menuCategories = categoriesRes?.items || [];
    systemTranslations = translationsRes?.items || [];
  } catch (e) {
    console.error("Pocketbase fetch error", e);
  }

  return (
    <LandingClient 
      menuItems={menuItems} 
      landingSettings={landingSettings} 
      categories={menuCategories} 
      systemTranslations={systemTranslations}
    />
  );
}
