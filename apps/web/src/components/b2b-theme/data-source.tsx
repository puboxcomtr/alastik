export function DataSource({
  source,
  ayrinti,
  dateField,
  cancelRule,
  tazelik,
  kapsamUyarisi,
}: {
  source: string;
  ayrinti: string;
  dateField: string;
  cancelRule: string;
  tazelik: string;
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
