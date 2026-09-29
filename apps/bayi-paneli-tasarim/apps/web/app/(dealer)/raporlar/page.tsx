import Link from "next/link";

const RAPORLAR = [
  {
    href: "/raporlar/cari-hareketler",
    baslik: "Cari Hareketler",
    aciklama: "Borç/alacak dökümü, yürüyen bakiye ve CSV indirme.",
  },
  {
    href: "/raporlar/vade-takvimi",
    baslik: "Vade Takvimi",
    aciklama: "Açık faturaların aylık vade dağılımı ve gecikme durumu.",
  },
  {
    href: "/raporlar/siparis-raporu",
    baslik: "Sipariş Raporu",
    aciklama: "Tarih aralığına göre sipariş kalemleri ve tutarlar.",
  },
  {
    href: "/raporlar/alim-adet",
    baslik: "Bayi Alım Adet Raporu",
    aciklama: "Dönem bazlı lastik/jant adedi ve toplam alış tutarı.",
  },
  {
    href: "/raporlar/odemeler",
    baslik: "Kasa Tahsilatları",
    aciklama: "Kasadan geçen tahsilat kayıtları (kapsam notuyla birlikte).",
  },
  {
    href: "/raporlar/taksit-secenekleri",
    baslik: "Taksit Seçenekleri",
    aciklama: "Kredi kartıyla yapılabilen taksit sayıları — bilgilendirme.",
  },
];

export default function RaporlarPage() {
  return (
    <>
      <div className="page-head">
        <div>
          <h1>Raporlar</h1>
          <p className="sub">
            Cari, vade ve sipariş raporlarınız. Her rapor verinin kaynağını ve
            kapsamını ekranda yazar.
          </p>
        </div>
      </div>

      <div className="cari-kisayol">
        {RAPORLAR.map((r) => (
          <Link key={r.href} href={r.href} className="kisayol">
            <div>
              <strong>{r.baslik}</strong>
              <span>{r.aciklama}</span>
            </div>
          </Link>
        ))}
      </div>
    </>
  );
}
