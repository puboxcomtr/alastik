/**
 * Rapor başlığı altındaki VERİ KAYNAĞI şeridi.
 *
 * Her rapor, verinin nereden geldiğini ve ne kadar taze olduğunu ekranda
 * yazar; kullanıcı hangi rakamın nereden geldiğini tahmin etmek zorunda
 * kalmaz. Farklı kaynaklar tek toplamda sessizce birleştirilmez.
 */
export function VeriKaynagi({
  kaynak,
  ayrinti,
  tarihAlani,
  iptalKurali,
  tazelik,
  kapsamUyarisi,
}: {
  /** "Örnek veri", "ERP (canlı)", "Platform" … */
  kaynak: string;
  /** Kullanılan tablo ya da servis ucu. */
  ayrinti: string;
  /** Filtrenin dayandığı tarih alanı. */
  tarihAlani: string;
  /** İptal/iade kayıtlarının işlenişi. */
  iptalKurali: string;
  /** "27.07.2026 11:45 itibarıyla" gibi; canlı raporlarda "her açılışta". */
  tazelik: string;
  /** Bilinen kapsam eksiği varsa açık uyarı (sarı şerit). */
  kapsamUyarisi?: string;
}) {
  return (
    <>
      <div className="veri-kaynagi">
        <span className={`vk-etiket${kaynak === "Platform" ? " platform" : ""}`}>
          {kaynak}
        </span>
        <span>
          <strong>Kaynak:</strong> {ayrinti}
        </span>
        <span>
          <strong>Tarih alanı:</strong> {tarihAlani}
        </span>
        <span>
          <strong>İptal/iade:</strong> {iptalKurali}
        </span>
        <span>
          <strong>Veri zamanı:</strong> {tazelik}
        </span>
      </div>
      {kapsamUyarisi ? (
        <div className="alert warn" style={{ marginTop: "0.5rem" }}>
          <strong>Veri kapsamı:</strong> {kapsamUyarisi}
        </div>
      ) : null}
    </>
  );
}
