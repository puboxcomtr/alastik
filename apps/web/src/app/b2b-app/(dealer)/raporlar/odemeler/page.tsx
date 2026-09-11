"use client";

import { useState } from "react";
import { DataSource } from "@components/b2b-tema/veri-kaynagi";
import { formatKurus, gunFormat } from "@components/b2b-tema/lib/format";
import { PAYMENTS } from "@components/b2b-tema/lib/ornek-veri";

type Sekme = "tumu" | "gecerli" | "iptal";

/**
 * Kasa Tahsilatları — bilinçli olarak "Tüm Ödemelerim" DEĞİL.
 *
 * Kasadan geçmeyen ödemeler (havale/EFT, çek, senet, mahsup) bu listede
 * görünmez; eksik türler SIFIR SAYILMAZ, ekranda kapsam uyarısı yazılır.
 */
export default function OdemelerPage() {
  const [sekme, setSekme] = useState<Sekme>("tumu");
  const [q, setQ] = useState("");

  // Örnek veride iptal kaydı yok; sekme yine de tasarımda yer alıyor.
  const gecerli = PAYMENTS;
  const iptaller: typeof PAYMENTS = [];
  const gecerliToplam = gecerli.reduce((t, o) => t + o.tutarKurus, 0);

  const secilen =
    sekme === "iptal" ? iptaller : sekme === "gecerli" ? gecerli : PAYMENTS;
  const query = q.trim().toLocaleLowerCase("tr");
  const listelenen = query
    ? secilen.filter(
        (o) =>
          o.belgeNo.toLocaleLowerCase("tr").includes(query) ||
          o.kasaAdi.toLocaleLowerCase("tr").includes(query) ||
          (o.aciklama ?? "").toLocaleLowerCase("tr").includes(query),
      )
    : secilen;

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Kasa Tahsilatları</h1>
          <p className="sub">
            Kasadan geçen tahsilat kayıtlarınız —{" "}
            {PAYMENTS.length.toLocaleString("tr-TR")} işlem. Bu liste tüm
            ödemelerinizi kapsamaz (aşağıdaki kapsam notuna bakın).
          </p>
        </div>
      </div>

      <DataSource
        kaynak="Örnek veri"
        ayrinti="lib/ornek-veri.ts → ODEMELER (yalnızca kasa işlemleri)"
        dateField="işlem tarihi"
        cancelRule="iptaller ayrı sekmede, toplama katılmaz"
        tazelik="örnek veri"
        kapsamUyarisi={
          "Bu ekran YALNIZCA kasadan geçen tahsilatları gösterir. Banka " +
          "havalesi/EFT, çek, senet, mahsup ve cari hesap fişi ile yapılan " +
          "ödemeler burada GÖRÜNMEZ — bu türler sıfır kabul edilmemiştir. " +
          "Ödemelerinizin tam dökümü için cari hesap ekstrenizi isteyin."
        }
      />

      <h2 className="section">Kasa Tahsilatları Özeti</h2>
      <div className="rapor-kartlar">
        <div className="rapor-kart yesil">
          <div className="etiket">✓ Geçerli kayıtlar</div>
          <div className="deger">{formatKurus(gecerliToplam)}</div>
          <div className="note">
            {gecerli.length} işlem · yalnızca kasa tahsilatları toplamı
          </div>
        </div>
        <div className="rapor-kart kirmizi">
          <div className="etiket">✕ İptal edilmiş</div>
          <div className="deger">{iptaller.length}</div>
          <div className="note">iptal işaretli kayıt</div>
        </div>
        <div className="rapor-kart">
          <div className="etiket">Σ Kayıt sayısı</div>
          <div className="deger">{PAYMENTS.length}</div>
          <div className="note">iptaller dahil</div>
        </div>
      </div>

      <div className="actions-row" style={{ marginBottom: "0.8rem", flexWrap: "wrap" }}>
        {(
          [
            ["tumu", `Tümü (${PAYMENTS.length})`],
            ["gecerli", `Geçerli (${gecerli.length})`],
            ["iptal", `İptal (${iptaller.length})`],
          ] as const
        ).map(([anahtar, etiket]) => (
          <button
            key={anahtar}
            type="button"
            className={`ozellik-cip${sekme === anahtar ? " secili" : ""}`}
            onClick={() => setSekme(anahtar)}
          >
            {etiket}
          </button>
        ))}
      </div>

      <form className="searchbar" onSubmit={(e) => e.preventDefault()}>
        <input
          type="search"
          placeholder="Fiş no, kasa adı veya açıklama ara..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <button type="submit">Ara</button>
      </form>

      <div style={{ marginTop: "0.9rem" }}>
        {listelenen.map((o) => (
          <div className="odeme-kart" key={o.belgeNo}>
            <div className="ust">
              <div>
                <span className="fisno">#{o.belgeNo}</span>{" "}
                <span className="badge info">{o.kasaAdi}</span>
              </div>
              <span className="badge ok">Geçerli kayıt</span>
            </div>
            <div className="ust" style={{ marginTop: "0.35rem" }}>
              <div className="alt" style={{ marginTop: 0 }}>
                {o.aciklama ? <span>{o.aciklama}</span> : null}
              </div>
              <div className="tutar">{formatKurus(o.tutarKurus)}</div>
            </div>
            <div className="alt">
              <span>📅 {gunFormat(o.tarih)}</span>
            </div>
          </div>
        ))}
        {listelenen.length === 0 ? (
          <p className="note" style={{ padding: "1.5rem 0" }}>
            Kasadan geçen tahsilat kaydı bulunamadı. Havale/EFT ile ödeme
            yaptıysanız bu listede görünmez (yukarıdaki kapsam notu).
          </p>
        ) : null}
      </div>
    </>
  );
}
