"use client";

// Bayi anasayfa banner'ı: admin Tema > Slider Ayarları'nda seçilen (Slider Yönetimi'ndeki)
// slider'dan gelir. Client-side çekilir (tarayıcı → API, Origin b2b'yi çözer); SSR'nin
// sunucudan API'ye erişememesi sorununu aşar. Slider yoksa/boşsa yer tutucu örneğe düşer.
import { useEffect, useState } from "react";
import { BannerCarousel, type BannerImage } from "@components/b2b-theme/banner-carousel";
import { getSliderById, getSliderImageUrl } from "@/src/services/sliderService";
import { API_ENDPOINTS } from "@src/config/api";

// Plasiyer oturumu mu? (plasiyerToken varsa: bayisiz devam VEYA bir bayi adına giriş)
// Her iki durumda da bayi slider'ı gizlenir — plasiyer oturumu olduğu belli olsun.
function plasiyerOturumu(): boolean {
  try {
    return !!localStorage.getItem("plasiyerToken");
  } catch {
    return false;
  }
}

export function HomeBanner() {
  // Plasiyer bayi adına girdiyse slider gösterilmez (plasiyer oturumu olduğu belli olsun)
  const [gizli, setGizli] = useState(false);
  useEffect(() => { setGizli(plasiyerOturumu()); }, []);
  // Boş başlar (yanlış/örnek banner flash'ı olmasın); seçili slider gelince görünür
  const [banners, setBanners] = useState<BannerImage[]>([]);
  // Slider Yönetimi'ndeki genişlik/yükseklik oranı (banner bu oranla, tam genişlikte gösterilir)
  const [aspectRatio, setAspectRatio] = useState<number | undefined>(undefined);
  // Slayt görüntülenme (bekleme) süresi — displayDuration
  const [displayDuration, setDisplayDuration] = useState<number | undefined>(undefined);

  useEffect(() => {
    let iptal = false;
    (async () => {
      try {
        const res = await fetch(API_ENDPOINTS.b2b.themeSettings(), { headers: { "X-Site": "b2b" } });
        const json = await res.json();
        const sliderId: string = json?.success ? (json.data?.sliderSelect || "") : "";
        if (!sliderId) return;

        const slider = await getSliderById(sliderId);
        const slides = (slider?.sliders || [])
          .filter((s) => s.isActive !== false && s.image)
          .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
        if (slides.length === 0 || iptal) return;

        const w = parseInt(String(slider?.settings?.width || "")) || 0;
        const h = parseInt(String(slider?.settings?.height || "")) || 0;
        if (w > 0 && h > 0) setAspectRatio(w / h);
        const dd = parseInt(String(slider?.settings?.displayDuration || "")) || 0;
        if (dd > 0) setDisplayDuration(dd);

        setBanners(
          slides.map((s, i) => ({
            id: String(i),
            title: s.description || "",
            imageUrl: getSliderImageUrl(s.image),
            link: s.link || null,
          }))
        );
      } catch {
        // hata olursa örnek bannerlar kalır
      }
    })();
    return () => { iptal = true; };
  }, []);

  if (gizli) return null;

  return <BannerCarousel banners={banners} aspectRatio={aspectRatio} displayDuration={displayDuration} />;
}
