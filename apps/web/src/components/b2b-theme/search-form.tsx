"use client";

import { useEffect, useState } from "react";
import { SearchIcon } from "@components/b2b-theme/icons";

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
  formId?: string;
  butonGizle?: boolean;
}) {
  const [text, setMetin] = useState(q);

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
