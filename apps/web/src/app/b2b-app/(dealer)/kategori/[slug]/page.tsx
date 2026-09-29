import { CategoryCatalog } from "@components/b2b-theme/category-catalog";
import { API_ENDPOINTS } from "@src/config/api";

/** Slug'ı okunabilir başlığa çevirir: "otomobil-lastikleri" → "Otomobil Lastikleri".
 *  Yalnızca gerçek kategori adı alınamazsa yedek olarak kullanılır. */
function makeTitle(slug: string): string {
  return slug
    .split("-")
    .filter(Boolean)
    .map((k) => k.charAt(0).toLocaleUpperCase("tr") + k.slice(1))
    .join(" ");
}

/** Kategorinin gerçek adını (webcategories.name) slug ile getirir. */
async function getCategoryName(slug: string): Promise<string | null> {
  try {
    const res = await fetch(API_ENDPOINTS.categories.bySlug(slug), {
      headers: { "X-Site": "b2b" },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const d = await res.json();
    return d?.data?.name || d?.name || null;
  } catch {
    return null;
  }
}

export default async function KategoriPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const title = (await getCategoryName(slug)) || makeTitle(slug);

  return (
    <>
      <div className="page-head">
        <div>
          <h1>{title}</h1>
        </div>
      </div>
      <CategoryCatalog kategori={slug} />
    </>
  );
}
