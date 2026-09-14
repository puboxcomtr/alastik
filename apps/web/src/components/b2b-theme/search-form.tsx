"use client";

import { useEffect, useState } from "react";
import { SearchIcon } from "@components/b2b-theme/icons";

/**
 * Katalog query kutusu. Arama tarayıcıda yapıldığı için page yenilenmez;
 * girilen text `onSearch` ile yukarı bildirilir.
 */
export function SearchForm({
  q,
  onSearch,
  placeholder = "Ebat ürün kodu ile arayabilirsiniz",
  formId,
  butonGizle = false,
}: {
  q: string;
  onSearch: (q: string) => void;
  placeholder?: string;
  /** Dışarıdaki bir submit butonunun form={formId} ile bağlanabilmesi için */
  formId?: string;
  butonGizle?: boolean;
}) {
  const [text, setMetin] = useState(q);

  // Dışarıdan q değişince (ör. Temizle) kutuyu eşitle
  useEffect(() => {
    setMetin(q);
  }, [q]);

  return (
    <form
      id={formId}
      className="searchbar"
      onSubmit={(e) => {
        e.preventDefault();
        onSearch(text.trim());
      }}
    >
      <input
        type="search"
        name="q"
        placeholder={placeholder}
        value={text}
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
