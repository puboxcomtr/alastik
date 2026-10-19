"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDownIcon } from "./icons";

export type DropdownOption = { value: string; label: string };

export function Dropdown({
  title,
  options,
  value,
  onSelect,
  searchThreshold = 12,
}: {
  title: string;
  options: DropdownOption[];
  value?: string | undefined;
  onSelect: (value: string) => void;
  searchThreshold?: number;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const boxRef = useRef<HTMLDivElement>(null);

  const selected = options.find((s) => s.value === value);

  useEffect(() => {
    if (!open) return;
    const onOutsideClick = (e: MouseEvent) => {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onOutsideClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onOutsideClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function select(newValue: string) {
    setOpen(false);
    setQuery("");
    onSelect(newValue);
  }

  const normalizeText = (m: string) =>
    m.toLocaleLowerCase("tr").replace(/[^a-z0-9şğüöçı]/gi, "");
  const normalizedQuery = normalizeText(query);
  const filteredOptions = normalizedQuery
    ? options.filter((s) => normalizeText(s.label).includes(normalizedQuery))
    : options;

  return (
    <div
      ref={boxRef}
      className={`acilir${open ? " open" : ""}${selected ? " selected" : ""}`}
    >
      <button
        type="button"
        className="dropdown-button"
        aria-label={title}
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={() => setOpen((a) => !a)}
      >
        <span className="text">{selected?.label ?? title}</span>
        <ChevronDownIcon size={15} className="ok" />
      </button>

      {open ? (
        <div className="dropdown-panel" role="listbox">
          {options.length >= searchThreshold ? (
            <input
              className="dropdown-search"
              type="text"
              placeholder={`${title} ara…`}
              value={query}
              autoFocus
              onChange={(e) => setQuery(e.target.value)}
            />
          ) : null}
          <div className="dropdown-list">
            <button
              type="button"
              className={`dropdown-option${!value ? " isaretli" : ""}`}
              onClick={() => select("")}
            >
              Tümü
            </button>
            {filteredOptions.map((s) => (
              <button
                key={s.value}
                type="button"
                role="option"
                aria-selected={s.value === value}
                className={`dropdown-option${s.value === value ? " isaretli" : ""}`}
                onClick={() => select(s.value)}
              >
                {s.label}
              </button>
            ))}
            {filteredOptions.length === 0 ? (
              <p className="dropdown-empty">Eşleşen seçenek yok.</p>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
