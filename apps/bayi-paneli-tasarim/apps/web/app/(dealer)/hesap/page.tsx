import { ParolaFormu } from "@/components/parola-formu";
import { formatKurus } from "@/lib/format";
import { BAYI } from "@/lib/ornek-veri";

const KULLANICILAR = [
  { id: "u1", email: BAYI.eposta, durum: "aktif", createdAt: new Date("2025-11-04") },
  { id: "u2", email: "satinalma@bayi.com", durum: "aktif", createdAt: new Date("2026-02-17") },
  { id: "u3", email: "muhasebe@bayi.com", durum: "pasif", createdAt: new Date("2026-05-29") },
];

export default function HesapPage() {
  return (
    <>
      <div className="page-head">
        <div>
          <h1>Hesap Ayarları</h1>
          <p className="sub">
            Bayi bilgilerinizi görüntüleyin, parolanızı değiştirin.
          </p>
        </div>
      </div>

      <h2 className="section">Bayi Bilgileri</h2>
      <div className="cards">
        <div className="card">
          <div className="label">Unvan</div>
          <div className="value" style={{ fontSize: "1.05rem" }}>
            {BAYI.unvan}
          </div>
        </div>
        <div className="card">
          <div className="label">Cari Kodu</div>
          <div className="value" style={{ fontSize: "1.05rem" }}>
            {BAYI.cariKodu}
          </div>
        </div>
        <div className="card">
          <div className="label">Kredi Limiti</div>
          <div className="value">{formatKurus(BAYI.krediLimitiKurus)}</div>
        </div>
        <div className="card">
          <div className="label">Ödeme Vadesi</div>
          <div className="value">{BAYI.odemeVadeGun} gün</div>
        </div>
        <div className="card">
          <div className="label">Bayi İskontosu</div>
          <div className="value">
            %{(BAYI.iskontoBps / 100).toLocaleString("tr-TR")}
          </div>
        </div>
      </div>
      <p className="note">
        Unvan, limit, vade ve iskonto bilgileri temsilciniz tarafından
        güncellenir. Değişiklik için bizimle iletişime geçin.
      </p>

      <h2 className="section">Parola Değiştir</h2>
      <ParolaFormu />

      <h2 className="section">Hesap Kullanıcıları</h2>
      <div className="tablewrap">
        <table className="data">
          <thead>
            <tr>
              <th>E-posta</th>
              <th>Durum</th>
              <th>Oluşturulma</th>
            </tr>
          </thead>
          <tbody>
            {KULLANICILAR.map((u) => (
              <tr key={u.id}>
                <td>
                  {u.email}
                  {u.email === BAYI.eposta ? (
                    <span className="badge brand" style={{ marginLeft: "0.5rem" }}>
                      Siz
                    </span>
                  ) : null}
                </td>
                <td>
                  <span
                    className={`badge ${u.durum === "aktif" ? "ok" : "danger"}`}
                  >
                    {u.durum}
                  </span>
                </td>
                <td>{u.createdAt.toLocaleDateString("tr-TR")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="note" style={{ marginTop: "0.75rem" }}>
        Yeni kullanıcı açılışı yalnızca yönetim tarafından yapılır.
      </p>
    </>
  );
}
