import DealerForm from "@/src/components/lastikjantavm/dealerForm/DealerForm";

export const metadata = {
  title: "Montaj Noktası Bilgi ve Fiyat Formu | LastikJantAVM B2B",
  robots: { index: false, follow: false },
};

export default function B2bDealerFormPage() {
  return <DealerForm site="b2b" karsilama={false} girisGerekli sarmalayici="bayi-formu-sayfa" />;
}
