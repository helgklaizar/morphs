import LandingClient from "@/components/LandingClient";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default async function Home() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002/api';

  let menuItems: Record<string, unknown>[] = [];
  let landingSettings: Record<string, unknown> = {};
  let menuCategories: Record<string, unknown>[] = [];
  let systemTranslations: Record<string, unknown>[] = [];

  try {
    const fetchHelper = async (endpoint: string) => {
      const res = await fetch(`${apiUrl}${endpoint}`, { cache: 'no-store' });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    };

    const [itemsRes, settingsRes, categoriesRes, translationsRes] = await Promise.all([
      fetchHelper('/menu').catch(() => []),
      fetchHelper('/system/settings').catch(() => ({ items: [{}] })),
      fetchHelper('/menu/categories').catch(() => []),
      fetchHelper('/system/translations').catch(() => ({ items: [] }))
    ]);
    
    // Hono returns direct lists for menu and categories, while settings uses items wrapper
    menuItems = itemsRes || [];
    landingSettings = settingsRes?.items?.[0] || {};
    menuCategories = categoriesRes || [];
    systemTranslations = translationsRes?.items || [];
  } catch (e) {
    console.error("Hono API fetch error", e);
  }

  return (
    <LandingClient 
      menuItems={menuItems as any} 
      landingSettings={landingSettings} 
      categories={menuCategories as any} 
      systemTranslations={systemTranslations as any}
    />
  );
}
