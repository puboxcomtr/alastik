"use client";

// Aranabilir açılır liste (autocomplete). Yerel <select> yerine kullanılır:
// yazarak filtreleme, klavye ile gezinme ve temizleme (×) sağlar. Görünüm
// tema select'leriyle aynı (yükseklik/kenar/renk CSS'ten gelir).
import { useEffect, useMemo, useRef, useState } from "react";

export type AutoOption = { value: string; label: string };

export function AutoComplete({
  value,
  onChange,
  options,
  placeholder,
  ariaLabel,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  options: AutoOption[];
  placeholder: string;
  ariaLabel?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(-1);
  const rootRef = useRef<HTMLDivElement>(null);

  // Seçili değerin etiketi (girişte gösterilir)
  const selectedLabel = useMemo(
    () => options.find((o) => o.value === value)?.label ?? "",
    [options, value],
  );

  // Açıkken yazılana göre süz; kapalıyken tüm liste
  const filteredOptions = useMemo(() => {
    const q = query.trim().toLocaleLowerCase("tr");
    if (!q) return options;
    return options.filter((o) => o.label.toLocaleLowerCase("tr").includes(q));
  }, [options, query]);

  // Dışarı tıklayınca kapan
  useEffect(() => {
    if (!open) return;
    function elTikla(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    }
    document.addEventListener("mousedown", elTikla);
    return () => document.removeEventListener("mousedown", elTikla);
  }, [open]);

  function ac() {
    setOpen(true);
    setQuery("");
    setActiveIndex(-1);
  }

  function sec(v: string) {
    onChange(v);
    setOpen(false);
    setQuery("");
  }

  function klavye(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!open) return ac();
      setActiveIndex((i) => Math.min(i + 1, filteredOptions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (open && activeIndex >= 0 && filteredOptions[activeIndex]) sec(filteredOptions[activeIndex].value);
    } else if (e.key === "Escape") {
      setOpen(false);
      setQuery("");
    }
  }

  return (
    <div ref={rootRef} className={`autocomplete${className ? " " + className : ""}`}>
      <input
        type="text"
        className="ac-input"
        role="combobox"
        aria-label={ariaLabel}
        aria-expanded={open}
        autoComplete="off"
        placeholder={placeholder}
        value={open ? query : selectedLabel}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
          setActiveIndex(-1);
        }}
        onFocus={ac}
        onKeyDown={klavye}
      />
      {value && !open ? (
        <button
          type="button"
          className="ac-clear"
          aria-label="Seçimi temizle"
          onMouseDown={(e) => {
            e.preventDefault();
            sec("");
          }}
        >
          ×
        </button>
      ) : (
        <span className="ac-arrow" aria-hidden="true">▾</span>
      )}

      {open ? (
        <ul className="ac-list" role="listbox">
          {filteredOptions.length === 0 ? (
            <li className="ac-empty">Sonuç yok</li>
          ) : (
            filteredOptions.map((o, i) => (
              <li
                key={o.value}
                role="option"
                aria-selected={o.value === value}
                className={`ac-option${i === activeIndex ? " vurgu" : ""}${o.value === value ? " selected" : ""}`}
                onMouseEnter={() => setActiveIndex(i)}
                onMouseDown={(e) => {
                  e.preventDefault();
                  sec(o.value);
                }}
              >
                {o.label}
              </li>
            ))
          )}
        </ul>
      ) : null}
    </div>
  );
}
