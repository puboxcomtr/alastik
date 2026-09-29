"use client";

// Aranabilir açılır liste (autocomplete). Yerel <select> yerine kullanılır:
// yazarak filtreleme, klavye ile gezinme ve temizleme (×) sağlar. Görünüm
// tema select'leriyle aynı (yükseklik/kenar/renk CSS'ten gelir).
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";

export type AutoOption = { value: string; label: string; icon?: ReactNode };

export function AutoComplete({
  value,
  onChange,
  options,
  placeholder,
  ariaLabel,
  className,
  multiple = false,
}: {
  value: string;
  onChange: (value: string) => void;
  options: AutoOption[];
  placeholder: string;
  ariaLabel?: string;
  className?: string;
  /** Çoklu seçim: value virgülle ayrılmış değerler; seçim listeyi kapatmaz. */
  multiple?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(-1);
  const rootRef = useRef<HTMLDivElement>(null);

  // Seçili değer(ler): tekli modda tek eleman, çoklu modda virgülle ayrılmış.
  const selectedValues = useMemo(
    () => (multiple ? value.split(",").map((s) => s.trim()).filter(Boolean) : value ? [value] : []),
    [multiple, value],
  );

  // Girişte gösterilecek metin (çoklu modda etiketler / "N seçili")
  const selectedLabel = useMemo(() => {
    const labelOf = (v: string) => options.find((o) => o.value === v)?.label ?? v;
    if (!multiple) return options.find((o) => o.value === value)?.label ?? "";
    if (selectedValues.length === 0) return "";
    if (selectedValues.length <= 2) return selectedValues.map(labelOf).join(", ");
    return `${selectedValues.length} seçili`;
  }, [multiple, options, value, selectedValues]);

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

  // Çoklu modda bir değeri ekler/çıkarır; liste açık kalır.
  function degistir(v: string) {
    const set = new Set(selectedValues);
    if (set.has(v)) set.delete(v);
    else set.add(v);
    onChange([...set].join(","));
    setQuery("");
    setActiveIndex(-1);
  }

  // Bir seçeneğe tıklandığında: çoklu modda toggle (açık kal), tekli modda seç + kapat.
  function secOrToggle(v: string) {
    if (multiple) degistir(v);
    else sec(v);
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
      if (open && activeIndex >= 0 && filteredOptions[activeIndex]) secOrToggle(filteredOptions[activeIndex].value);
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
        onClick={() => { if (!open) ac(); }}
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
        <ul className="ac-list" role="listbox" aria-multiselectable={multiple || undefined}>
          {filteredOptions.length === 0 ? (
            <li className="ac-empty">Sonuç yok</li>
          ) : (
            filteredOptions.map((o, i) => {
              const secili = selectedValues.includes(o.value);
              return (
                <li
                  key={o.value}
                  role="option"
                  aria-selected={secili}
                  className={`ac-option${i === activeIndex ? " vurgu" : ""}${secili ? " selected" : ""}`}
                  onMouseEnter={() => setActiveIndex(i)}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    secOrToggle(o.value);
                  }}
                >
                  {o.icon ? <span className="ac-opt-icon" aria-hidden="true">{o.icon}</span> : null}
                  <span className="ac-opt-label">{o.label}</span>
                  {multiple && secili ? <span className="ac-check" aria-hidden="true">✓</span> : null}
                </li>
              );
            })
          )}
        </ul>
      ) : null}
    </div>
  );
}
