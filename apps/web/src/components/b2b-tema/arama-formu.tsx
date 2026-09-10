"use client";

import { useState } from "react";
import { SearchIcon } from "@components/b2b-tema/icons";

/**
 * Katalog arama kutusu. Arama tarayıcıda yapıldığı için sayfa yenilenmez;
 * girilen metin `onAra` ile yukarı bildirilir.
 */
export function AramaFormu({
  q,
  onAra,
  placeholder = "Ebat ürün kodu ile arayabilirsiniz",
  formId,
  butonGizle = false,
}: {
  q: string;
  onAra: (q: string) => void;
  placeholder?: string;
  /** Dışarıdaki bir submit butonunun form={formId} ile bağlanabilmesi için */
  formId?: string;
  butonGizle?: boolean;
}) {
  const [metin, setMetin] = useState(q);

  return (
    <form
      id={formId}
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
      {butonGizle ? null : (
        <button type="submit">
          <SearchIcon size={17} /> Ara
        </button>
      )}
    </form>
  );
}
