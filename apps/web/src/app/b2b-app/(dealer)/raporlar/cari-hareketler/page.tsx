"use client";

import { useMemo, useState } from "react";
import { CsvIndir } from "@components/b2b-tema/csv-indir";
import { VeriKaynagi } from "@components/b2b-tema/veri-kaynagi";
import { formatKurus, formatTarih, gunFormat } from "@components/b2b-tema/lib/format";
import { BAYI, BUGUN, CARI_HAREKETLER, CARI_OZET } from "@components/b2b-tema/lib/ornek-veri";

const BU_YIL = BUGUN.getFullYear();
const YILLAR = [BU_YIL, BU_YIL - 1, BU_YIL - 2];

/**
 * Cari Hareketler.
 *
 * Resmi cari toplamları ile ekranda listelenen satırların kontrol toplamı
 * AYRI kartlarda gösterilir; tek toplamda birleştirilmez. Yürüyen bakiye
 * yalnızca ikisi örtüşürse yayınlanır — örtüşmüyorsa tahmini bakiye
 * üretmek yerine gizlenir ve nedeni yazılır.
 */
export default function CariHareketlerPage() {
  const [yil, setYil] = useState(String(BU_YIL));
  const [baslangic, setBaslangic] = useState("");
  const [bitis, setBitis] = useState("");

  const hareketler = useMemo(() => {
    return CARI_HAREKETLER.filter((h) => {
      if (yil && h.tarih.getFullYear() !== Number(yil)) return false;
      if (baslangic && h.tarih < new Date(`${baslangic}T00:00:00Z`)) return false;
      if (bitis && h.tarih > new Date(`${bitis}T23:59:59Z`)) return false;
      return true;
    }).sort((a, b) => a.tarih.getTime() - b.tarih.getTime());
  }, [yil, baslangic, bitis]);

  // İptaller listelenir ama TOPLAMLARA katılmaz.
  const gecerliler = hareketler.filter((h) => !h.iptal);
  const kontrolBorc = gecerliler.reduce((t, h) => t + h.borcKurus, 0);
  const kontrolAlacak = gecerliler.reduce((t, h) => t + h.alacakKurus, 0);

  /**
   * Bu şablonda listelenen satırlar bilinçli olarak resmi toplamın tamamını
   * kapsamaz (açılış devri ve kasadan geçmeyen ödemeler yok) — mutabakatın
   * tutmadığı durumun tasarımı da görünsün diye.
   */
  const borcFark = Math.abs(CARI_OZET.borcToplamKurus - kontrolBorc);
  const alacakFark = Math.abs(CARI_OZET.alacakToplamKurus - kontrolAlacak);
  const bakiyeGosterilebilir = borcFark <= 1 && alacakFark <= 1;
  const borclu = CARI_OZET.bakiyeKurus > 0;

  let yuruyen = 0;

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Cari Hareketler</h1>
          <p className="sub">Hesap hareketlerinizi ve bakiyenizi görüntüleyin.</p>
        </div>
        <CsvIndir
          dosyaAdi={`cari-hareketler-${yil || "tumu"}.csv`}
          basliklar={[
            "Belge Tarihi",
            "Vade Tarihi",
            "Belge No",
            "İşlem Tipi",
            "Borç",
            "Alacak",
            "İptal",
          ]}
          satirlar={hareketler.map((h) => [
            gunFormat(h.tarih),
            gunFormat(h.vadeTarihi),
            h.belgeNo,
            h.islemTipi,
            (h.borcKurus / 100).toFixed(2),
            (h.alacakKurus / 100).toFixed(2),
            h.iptal ? "evet" : "hayır",
          ])}
        />
      </div>

      <VeriKaynagi
        kaynak="Örnek veri"
        ayrinti="lib/ornek-veri.ts → CARI_HAREKETLER (satırlar) · CARI_OZET (özet kartlar)"
        tarihAlani="belge tarihi"
        iptalKurali="iptaller listelenir, rozetle işaretlenir, TOPLAMLARA katılmaz"
        tazelik={`örnek veri · ${formatTarih(BAYI.sonSenkronAt)} anlık görüntüsü`}
        kapsamUyarisi={
          "Bu ekran bir tasarım şablonudur; satırlar gerçek muhasebe kaydı " +
          "değildir. Gerçek veriye bağlanırken kasadan geçmeyen ödemeler " +
          "(havale, çek/senet, mahsup) ve açılış devri gibi eksik kalabilecek " +
          "kalemler kullanıcıya burada açıkça yazılmalıdır."
        }
      />

      <h2 className="section">Resmi Cari Toplamları</h2>
      <div className="rapor-kartlar">
        <div className="rapor-kart kirmizi">
          <div className="etiket">↙ Toplam Borç</div>
          <div className="deger">{formatKurus(CARI_OZET.borcToplamKurus)}</div>
          <div className="note">cari kart rakamı</div>
        </div>
        <div className="rapor-kart yesil">
          <div className="etiket">↗ Toplam Alacak</div>
          <div className="deger">{formatKurus(CARI_OZET.alacakToplamKurus)}</div>
          <div className="note">cari kart rakamı</div>
        </div>
        <div className={`rapor-kart${borclu ? " kirmizi" : " yesil"}`}>
          <div className="etiket">💳 Net Bakiye (geçerli)</div>
          <div className="deger">
            {formatKurus(Math.abs(CARI_OZET.bakiyeKurus))}
            <span style={{ fontSize: "0.8rem", fontWeight: 600, marginLeft: 6 }}>
              {borclu ? "Borçlu" : "Alacaklı"}
            </span>
          </div>
          <div className="note">cari kart rakamı</div>
        </div>
      </div>

      <h2 className="section">
        Bu Ekranda Listelenen Hareketlerin Kontrol Toplamı
      </h2>
      <div className="rapor-kartlar">
        <div className="rapor-kart">
          <div className="etiket">Listelenen borç</div>
          <div className="deger">{formatKurus(kontrolBorc)}</div>
          {borcFark > 1 ? (
            <div className="note" style={{ color: "var(--danger)" }}>
              resmi rakamdan {formatKurus(borcFark)} farklı
            </div>
          ) : (
            <div className="note">resmi rakamla örtüşüyor</div>
          )}
        </div>
        <div className="rapor-kart">
          <div className="etiket">Listelenen alacak</div>
          <div className="deger">{formatKurus(kontrolAlacak)}</div>
          {alacakFark > 1 ? (
            <div className="note" style={{ color: "var(--danger)" }}>
              resmi rakamdan {formatKurus(alacakFark)} farklı
            </div>
          ) : (
            <div className="note">resmi rakamla örtüşüyor</div>
          )}
        </div>
        <div className="rapor-kart">
          <div className="etiket">Mutabakat</div>
          <div className="deger">
            {bakiyeGosterilebilir ? "✓ Tutuyor" : "✕ Tutmuyor"}
          </div>
          <div className="note">
            {bakiyeGosterilebilir
              ? "yürüyen bakiye yayınlandı"
              : "yürüyen bakiye gizlendi"}
          </div>
        </div>
      </div>

      <div
        className="filterbar"
        style={{ alignItems: "flex-end", gap: "0.8rem", flexWrap: "wrap" }}
      >
        <div>
          <label htmlFor="yil" style={{ display: "block", fontSize: "0.8rem", fontWeight: 650 }}>
            Yıl
          </label>
          <select
            id="yil"
            className="mini"
            value={yil}
            onChange={(e) => setYil(e.target.value)}
          >
            {YILLAR.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="baslangic" style={{ display: "block", fontSize: "0.8rem", fontWeight: 650 }}>
            Başlangıç Tarihi
          </label>
          <input
            id="baslangic"
            type="date"
            value={baslangic}
            onChange={(e) => setBaslangic(e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="bitis" style={{ display: "block", fontSize: "0.8rem", fontWeight: 650 }}>
            Bitiş Tarihi
          </label>
          <input
            id="bitis"
            type="date"
            value={bitis}
            onChange={(e) => setBitis(e.target.value)}
          />
        </div>
        <button
          type="button"
          className="clear"
          onClick={() => {
            setYil(String(BU_YIL));
            setBaslangic("");
            setBitis("");
          }}
        >
          ✕
        </button>
        <span className="chip">
          {hareketler.length.toLocaleString("tr-TR")} kayıt gösteriliyor
        </span>
      </div>

      {!bakiyeGosterilebilir ? (
        <div className="alert warn">
          <strong>Yürüyen bakiye gösterilemiyor.</strong> Listelenen satırların
          toplamı resmi cari rakamıyla örtüşmüyor; tahmini bir bakiye
          üretilmedi.
        </div>
      ) : null}

      <div className="tablewrap">
        <table className="data">
          <thead>
            <tr>
              <th>Belge Tarihi</th>
              <th>Vade Tarihi</th>
              <th>Belge No</th>
              <th>İşlem Tipi</th>
              <th className="num">Borç</th>
              <th className="num">Alacak</th>
              {bakiyeGosterilebilir ? <th className="num">Bakiye</th> : null}
            </tr>
          </thead>
          <tbody>
            {hareketler.map((h, i) => {
              if (!h.iptal) yuruyen += h.borcKurus - h.alacakKurus;
              return (
                <tr
                  key={`${h.belgeNo}-${i}`}
                  style={h.iptal ? { opacity: 0.5 } : undefined}
                >
                  <td>{gunFormat(h.tarih)}</td>
                  <td>{gunFormat(h.vadeTarihi)}</td>
                  <td className="sku">
                    {h.belgeNo}
                    {h.iptal ? (
                      <span className="badge danger" style={{ marginLeft: 6 }}>
                        iptal
                      </span>
                    ) : null}
                  </td>
                  <td>
                    {h.islemTipi}
                    <div className="note">
                      {h.kaynak === "fatura" ? "fatura" : "kasa işlemi"}
                    </div>
                    {h.aciklama ? <div className="note">{h.aciklama}</div> : null}
                  </td>
                  <td className="num">
                    {h.borcKurus > 0 ? (
                      <strong style={{ color: "var(--danger)" }}>
                        {formatKurus(h.borcKurus)}
                      </strong>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="num">
                    {h.alacakKurus > 0 ? (
                      <strong style={{ color: "var(--success-text)" }}>
                        {formatKurus(h.alacakKurus)}
                      </strong>
                    ) : (
                      "—"
                    )}
                  </td>
                  {bakiyeGosterilebilir ? (
                    <td className="num">{h.iptal ? "—" : formatKurus(yuruyen)}</td>
                  ) : null}
                </tr>
              );
            })}
            {hareketler.length === 0 ? (
              <tr>
                <td colSpan={7} className="note" style={{ padding: "2rem" }}>
                  Seçilen aralıkta hareket yok.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </>
  );
}
