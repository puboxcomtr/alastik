import Link from "next/link";

const RAPORLAR = [
  {
    href: "/raporlar/cari-hareketler",
    title: "Cari Hareketler",
    aciklama: "Borç/alacak dökümü, yürüyen bakiye ve CSV indirme.",
  },
  {
    href: "/raporlar/vade-takvimi",
    title: "Vade Takvimi",
    aciklama: "Açık faturaların aylık vade dağılımı ve gecikme durumu.",
  },
  {
    href: "/raporlar/siparis-raporu",
    title: "Sipariş Raporu",
    aciklama: "Tarih aralığına göre sipariş kalemleri ve tutarlar.",
  },
  {
    href: "/raporlar/alim-adet",
    title: "Bayi Alım Adet Raporu",
    aciklama: "Dönem bazlı lastik/jant adedi ve toplam alış tutarı.",
  },
  {
    href: "/raporlar/odemeler",
    title: "Ödemeler",
    aciklama: "Hesabınıza işlenen tahsilat ve alacak hareketleri.",
  },
  {
    href: "/raporlar/taksit-secenekleri",
    title: "Taksit Seçenekleri",
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

      <div className="account-shortcut">
        {RAPORLAR.map((r) => (
          <Link key={r.href} href={r.href} className="kisayol">
            <div>
              <strong>{r.title}</strong>
              <span>{r.aciklama}</span>
            </div>
          </Link>
        ))}
      </div>
    </>
  );
}
