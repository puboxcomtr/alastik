// Montaj Noktası Bilgi ve Fiyat Formu — b2b bayi panelinde (/bayi-formu). LJA'daki formun aynısı; karşılama
// ekranı yoktur, doğrudan forma başlar. Yalnız giriş yapmış bayi doldurur, kayıt bayiye bağlanır.
import DealerForm from "@/src/components/lastikjantavm/dealerForm/DealerForm";

export const metadata = {
  title: "Montaj Noktası Bilgi ve Fiyat Formu | LastikJantAVM B2B",
  robots: { index: false, follow: false },
};

export default function B2bDealerFormPage() {
  return <DealerForm site="b2b" karsilama={false} girisGerekli sarmalayici="bayi-formu-sayfa" />;
}
