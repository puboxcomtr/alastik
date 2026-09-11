import { KategoriKatalog } from "@components/b2b-tema/kategori-katalog";

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
  const baslik = makeTitle(slug);

  return (
    <>
      <div className="page-head">
        <div>
          <h1>{baslik}</h1>
          <p className="sub">
            Ebat, marka, mevsim ve üretim yılı (DOT) ile süzebilirsiniz.
          </p>
        </div>
      </div>
      <KategoriKatalog kategori={slug} />
    </>
  );
}
