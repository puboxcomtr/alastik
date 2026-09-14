import { CategoryCatalog } from "@components/b2b-theme/category-catalog";

/** Slug'ı okunabilir başlığa çevirir: "otomobil-lastikleri" → "Otomobil Lastikleri". */
function makeTitle(slug: string): string {
  return slug
    .split("-")
    .filter(Boolean)
    .map((k) => k.charAt(0).toLocaleUpperCase("tr") + k.slice(1))
    .join(" ");
}

export default async function KategoriPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const title = makeTitle(slug);

  return (
    <>
      <div className="page-head">
        <div>
          <h1>{title}</h1>
          <p className="sub">
            LastikJantAVM güvencesiyle ürünleri toptan fiyatlarla güvenle
            sipariş edebilirsiniz.
          </p>
        </div>
      </div>
      <CategoryCatalog kategori={slug} />
    </>
  );
}
