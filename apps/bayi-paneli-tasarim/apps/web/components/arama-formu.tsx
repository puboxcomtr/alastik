"use client";

import { useState } from "react";
import { SearchIcon } from "@/components/icons";

/**
 * Katalog arama kutusu. Arama tarayıcıda yapıldığı için sayfa yenilenmez;
 * girilen metin `onAra` ile yukarı bildirilir.
 */
export function AramaFormu({
  q,
  onAra,
  placeholder = "Lastik ara — ebat, ürün kodu veya marka yazın...",
}: {
  q: string;
  onAra: (q: string) => void;
  placeholder?: string;
}) {
  const [metin, setMetin] = useState(q);

  return (
    <form
      className="searchbar"
      onSubmit={(e) => {
        e.preventDefault();
        onAra(metin.trim());
      }}
    >
      <input
        type="search"
        name="q"
        placeholder={placeholder}
        value={metin}
        onChange={(e) => setMetin(e.target.value)}
      />
      <button type="submit">
        <SearchIcon size={17} /> Ara
      </button>
    </form>
  );
}
