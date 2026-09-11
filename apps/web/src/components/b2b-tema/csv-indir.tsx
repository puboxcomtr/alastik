"use client";

/**
 * CSV indirme düğmesi.
 *
 * Dosya tarayıcıda üretilir (sunucu yok). İndirilen dosya ne ise o adla
 * sunulur: üretilen içerik CSV olduğu için uzantı `.csv`, tür `text/csv`.
 * Excel'in Türkçe yerelinde ayraç olarak noktalı virgül beklenir; BOM da
 * eklenir ki Türkçe karakterler bozulmasın.
 */
export function CsvDownload({
  dosyaAdi,
  basliklar,
  lines,
}: {
  dosyaAdi: string;
  basliklar: string[];
  lines: Array<Array<string | number>>;
}) {
  function indir(): void {
    const kacir = (h: string | number): string => {
      const metin = String(h);
      return /[";\n]/.test(metin) ? `"${metin.replace(/"/g, '""')}"` : metin;
    };
    const icerik = [basliklar, ...lines]
      .map((satir) => satir.map(kacir).join(";"))
      .join("\r\n");
    const blob = new Blob([`﻿${icerik}`], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = dosyaAdi.endsWith(".csv") ? dosyaAdi : `${dosyaAdi}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <button className="btn-ghost" type="button" onClick={indir}>
      ⬇ CSV İndir (Excel uyumlu)
    </button>
  );
}
