import { CategoryCatalog } from "@components/b2b-theme/category-catalog";
import { CategoryTabs, type CategoryTab } from "@components/b2b-theme/category-tabs";
import { API_ENDPOINTS } from "@src/config/api";

function makeTitle(slug: string): string {
  return slug
    .split("-")
    .filter(Boolean)
    .map((k) => k.charAt(0).toLocaleUpperCase("tr") + k.slice(1))
    .join(" ");
}

type CategoryInfo = { name: string | null; menuIds: string[] };

async function getCategoryInfo(slug: string): Promise<CategoryInfo> {
  try {
    const res = await fetch(API_ENDPOINTS.categories.bySlug(slug), {
      headers: { "X-Site": "b2b" },
      cache: "no-store",
    });
    if (!res.ok) return { name: null, menuIds: [] };
    const d = await res.json();
    const category = d?.data || d || {};
    return { name: category.name || null, menuIds: (category.menuIds || []).map(String) };
  } catch {
    return { name: null, menuIds: [] };
  }
}

type MenuItem = { name: string; menuType: string; linkData?: { categoryUrl?: string } };

async function getCategoryTabs(menuIds: string[]): Promise<CategoryTab[]> {
  if (!menuIds.length) return [];
  try {
    const res = await fetch(API_ENDPOINTS.menus.group(menuIds[0]), {
      headers: { "X-Site": "b2b" },
      next: { revalidate: 60 },
    });
    if (!res.ok) return [];
    const d = await res.json();
    const items: MenuItem[] = d?.data?.items || [];
    return items
      .filter((m) => m.menuType === "category" && m.linkData?.categoryUrl)
      .map((m) => ({ slug: m.linkData!.categoryUrl as string, label: m.name }));
  } catch {
    return [];
  }
}

export default async function KategoriPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const info = await getCategoryInfo(slug);
  const title = info.name || makeTitle(slug);
  const tabs = await getCategoryTabs(info.menuIds);

  return (
    <>
      <div className="page-head">
        <div>
          <h1>{title}</h1>
        </div>
      </div>
      {tabs.length > 1 ? <CategoryTabs tabs={tabs} /> : <CategoryCatalog kategori={slug} />}
    </>
  );
}
