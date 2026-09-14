/**
 * Rapor başlığı altındaki VERİ KAYNAĞI şeridi.
 *
 * Her rapor, verinin nereden geldiğini ve ne kadar taze olduğunu ekranda
 * yazar; kullanıcı hangi rakamın nereden geldiğini tahmin etmek zorunda
 * kalmaz. Farklı kaynaklar tek toplamda sessizce birleştirilmez.
 */
export function DataSource({
  source,
  ayrinti,
  dateField,
  cancelRule,
  tazelik,
  kapsamUyarisi,
}: {
  /** "Örnek veri", "ERP (canlı)", "Platform" … */
  source: string;
  /** Kullanılan tablo ya da servis ucu. */
  ayrinti: string;
  /** Filtrenin dayandığı tarih alanı. */
  dateField: string;
  /** İptal/iade kayıtlarının işlenişi. */
  cancelRule: string;
  /** "27.07.2026 11:45 itibarıyla" gibi; canlı raporlarda "her açılışta". */
  tazelik: string;
  /** Bilinen kapsam eksiği varsa açık uyarı (sarı şerit). */
  kapsamUyarisi?: string;
}) {
  return (
    <>
      <div className="data-source">
        <span className={`vk-label${source === "Platform" ? " platform" : ""}`}>
          {source}
        </span>
        <span>
          <strong>Kaynak:</strong> {ayrinti}
        </span>
        <span>
          <strong>Tarih alanı:</strong> {dateField}
        </span>
        <span>
          <strong>İptal/iade:</strong> {cancelRule}
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
