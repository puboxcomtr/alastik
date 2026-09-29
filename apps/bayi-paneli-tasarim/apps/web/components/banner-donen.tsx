"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export type BannerGoruntu = {
  id: string;
  baslik: string;
  gorselUrl: string;
  link: string | null;
};

const DONME_SURESI_MS = 6000;

/**
 * Anasayfa banner alanı. Tek banner varsa sabit durur; birden fazlaysa
 * kendiliğinden döner ve altta noktalarla gezinilir. Bannerlar admin
 * panelinden yönetilir (/admin/bannerlar).
 */
export function BannerDonen({ bannerlar }: { bannerlar: BannerGoruntu[] }) {
  const [sira, setSira] = useState(0);
  const adet = bannerlar.length;

  useEffect(() => {
    if (adet < 2) return;
    const zamanlayici = setInterval(
      () => setSira((s) => (s + 1) % adet),
      DONME_SURESI_MS,
    );
    return () => clearInterval(zamanlayici);
  }, [adet]);

  if (adet === 0) return null;
  const aktif = bannerlar[Math.min(sira, adet - 1)];
  if (!aktif) return null;

  const gorsel = (
    // Dış adresten gelen banner görseli; optimize edilmeden gösterilir.
    // eslint-disable-next-line @next/next/no-img-element
    <img src={aktif.gorselUrl} alt={aktif.baslik} className="banner-gorsel" />
  );

  return (
    <section className="banner-alani" aria-label="Duyurular">
      <div className="banner-cerceve">
        {aktif.link ? (
          aktif.link.startsWith("/") ? (
            <Link href={aktif.link}>{gorsel}</Link>
          ) : (
            <a href={aktif.link} target="_blank" rel="noopener noreferrer">
              {gorsel}
            </a>
          )
        ) : (
          gorsel
        )}
      </div>

      {adet > 1 ? (
        <div className="banner-noktalar">
          {bannerlar.map((b, i) => (
            <button
              key={b.id}
              type="button"
              className={i === sira ? "aktif" : undefined}
              aria-label={`${i + 1}. duyuru`}
              aria-current={i === sira}
              onClick={() => setSira(i)}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}
