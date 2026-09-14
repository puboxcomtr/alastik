/**
 * Tek SVG ikon seti — arayüzde emoji KULLANILMAZ.
 * Hepsi currentColor kullanır; boyut `size` ile ayarlanır.
 */
type IconProps = { size?: number; className?: string };

function svgProps(size: number) {
  return {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };
}

export function TireIcon({ size = 18, className }: IconProps) {
  return (
    <svg {...svgProps(size)} className={className}>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="3.5" />
      <path d="M12 3v5M12 16v5M3 12h5M16 12h5" />
    </svg>
  );
}

export function EditIcon({ size = 18, className }: IconProps) {
  return (
    <svg {...svgProps(size)} className={className}>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z" />
    </svg>
  );
}

export function ViewIcon({ size = 18, className }: IconProps) {
  return (
    <svg {...svgProps(size)} className={className}>
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

export function OrdersIcon({ size = 18, className }: IconProps) {
  return (
    <svg {...svgProps(size)} className={className}>
      <path d="M3 7.5 12 3l9 4.5v9L12 21l-9-4.5z" />
      <path d="M3 7.5 12 12l9-4.5M12 12v9" />
    </svg>
  );
}

export function CardIcon({ size = 18, className }: IconProps) {
  return (
    <svg {...svgProps(size)} className={className}>
      <rect x="2.5" y="5" width="19" height="14" rx="2.5" />
      <path d="M2.5 10h19M6 15h4" />
    </svg>
  );
}

export function UserIcon({ size = 18, className }: IconProps) {
  return (
    <svg {...svgProps(size)} className={className}>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M4.5 20a7.5 7.5 0 0 1 15 0" />
    </svg>
  );
}

export function CartIcon({ size = 18, className }: IconProps) {
  return (
    <svg {...svgProps(size)} className={className}>
      <path d="M2.5 3.5h2.2l2.3 11h10.4l2.1-8H6.2" />
      <circle cx="9" cy="19" r="1.5" />
      <circle cx="17" cy="19" r="1.5" />
    </svg>
  );
}

export function SearchIcon({ size = 18, className }: IconProps) {
  return (
    <svg {...svgProps(size)} className={className}>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4.5 4.5" />
    </svg>
  );
}

/** Yüklenme göstergesi — döner. `.spin` sınıfı globals.css'te animasyonu verir. */
export function SpinnerIcon({ size = 18, className }: IconProps) {
  return (
    <svg
      {...svgProps(size)}
      className={className ? `spin ${className}` : "spin"}
    >
      <path d="M12 3a9 9 0 1 0 9 9" />
    </svg>
  );
}

export function DashboardIcon({ size = 18, className }: IconProps) {
  return (
    <svg {...svgProps(size)} className={className}>
      <rect x="3" y="3" width="7.5" height="7.5" rx="1.5" />
      <rect x="13.5" y="3" width="7.5" height="7.5" rx="1.5" />
      <rect x="3" y="13.5" width="7.5" height="7.5" rx="1.5" />
      <rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.5" />
    </svg>
  );
}

export function StoreIcon({ size = 18, className }: IconProps) {
  return (
    <svg {...svgProps(size)} className={className}>
      <path d="M3.5 9.5V20h17V9.5" />
      <path d="M2.5 9.5 4.5 4h15l2 5.5a3 3 0 0 1-5.6 1.6 3 3 0 0 1-5.6 0 3 3 0 0 1-5.6-1.6Z" />
      <path d="M9.5 20v-5.5h5V20" />
    </svg>
  );
}

export function WarehouseIcon({ size = 18, className }: IconProps) {
  return (
    <svg {...svgProps(size)} className={className}>
      <path d="M3 20V8.5L12 4l9 4.5V20" />
      <path d="M7.5 20v-7h9v7M3 20h18" />
    </svg>
  );
}

export function UsersIcon({ size = 18, className }: IconProps) {
  return (
    <svg {...svgProps(size)} className={className}>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M2.8 19.5a6.2 6.2 0 0 1 12.4 0" />
      <path d="M16.5 5.2a3.2 3.2 0 0 1 0 5.9M18 14.4a6.2 6.2 0 0 1 3.2 5.1" />
    </svg>
  );
}

export function SyncIcon({ size = 18, className }: IconProps) {
  return (
    <svg {...svgProps(size)} className={className}>
      <path d="M20.5 12a8.5 8.5 0 0 1-14.6 5.9M3.5 12a8.5 8.5 0 0 1 14.6-5.9" />
      <path d="M18.5 2.5v4h-4M5.5 21.5v-4h4" />
    </svg>
  );
}

export function TrashIcon({ size = 16, className }: IconProps) {
  return (
    <svg {...svgProps(size)} className={className}>
      <path d="M3.5 6h17M9 6V4h6v2M6 6l1 14h10l1-14" />
    </svg>
  );
}

export function CloseIcon({ size = 18, className }: IconProps) {
  return (
    <svg {...svgProps(size)} className={className}>
      <path d="m5 5 14 14M19 5 5 19" />
    </svg>
  );
}

export function CheckIcon({ size = 14, className }: IconProps) {
  return (
    <svg {...svgProps(size)} className={className} strokeWidth={2.6}>
      <path d="m4 12.5 5 5 11-11" />
    </svg>
  );
}

export function ArrowRightIcon({ size = 16, className }: IconProps) {
  return (
    <svg {...svgProps(size)} className={className}>
      <path d="M4 12h15M13.5 6.5 20 12l-6.5 5.5" />
    </svg>
  );
}

export function ArrowLeftIcon({ size = 16, className }: IconProps) {
  return (
    <svg {...svgProps(size)} className={className}>
      <path d="M20 12H5M10.5 6.5 4 12l6.5 5.5" />
    </svg>
  );
}

export function CalendarIcon({ size = 15, className }: IconProps) {
  return (
    <svg {...svgProps(size)} className={className}>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </svg>
  );
}

export function AlertIcon({ size = 18, className }: IconProps) {
  return (
    <svg {...svgProps(size)} className={className}>
      <path d="M12 3.5 21.5 20H2.5z" />
      <path d="M12 10v4.5M12 17.5v.01" />
    </svg>
  );
}

/* ── Mevsim ikonları (tabloda emoji yerine) ─────────────── */

/**
 * YAZ — DOLU güneş: ortada dolu disk (r=5) + 8 kısa ışın (r 7.4→10.1).
 * Renk currentColor; .icon-summer sınıfı var(--mevsim-yaz) verir.
 */
export function SunIcon({ size = 18, className }: IconProps) {
  return (
    <svg {...svgProps(size)} className={className} aria-label="Yaz lastiği">
      <circle cx="12" cy="12" r="5" fill="currentColor" stroke="none" />
      <path
        strokeWidth={2.2}
        d="M12 4.6L12 1.9M17.23 6.77L19.14 4.86M19.4 12L22.1 12M17.23 17.23L19.14 19.14M12 19.4L12 22.1M6.77 17.23L4.86 19.14M4.6 12L1.9 12M6.77 6.77L4.86 4.86"
      />
    </svg>
  );
}

/**
 * KIŞ — 6 kollu ince kar tanesi: merkezden geçen 3 doğru (R=9) + her kolda
 * uçtan içe 45° açılan tek kademe çıkıntı. Tek kademe bilinçli: iki kademe
 * 18px'te yıldız lekesine dönüşüyor.
 */
export function SnowIcon({ size = 18, className }: IconProps) {
  return (
    <svg
      {...svgProps(size)}
      className={className}
      strokeWidth={1.7}
      aria-label="Kış lastiği"
    >
      <path d="M12 3L12 21M4.21 7.5L19.79 16.5M19.79 7.5L4.21 16.5" />
      <path d="M13.84 4.26L12 6.1L10.16 4.26M19.62 9.72L17.11 9.05L17.78 6.54M17.78 17.46L17.11 14.95L19.62 14.28M10.16 19.74L12 17.9L13.84 19.74M4.38 14.28L6.89 14.95L6.22 17.46M6.22 6.54L6.89 9.05L4.38 9.72" />
    </svg>
  );
}

/**
 * 4 MEVSİM — tek karede dikey bölünme (x=12): sol yarı dolu sarı yarım güneş
 * diski + 4 ışın, sağ yarı mavi kar tanesinin 3 kolu + iki kademe çıkıntı.
 * İki renkli olduğu için currentColor yerine .mv-* sınıflarını kullanır
 * (fill="var(--x)" bir presentation attribute olarak çalışmaz).
 */
export function DortMevsimIcon({ size = 18, className }: IconProps) {
  return (
    <svg {...svgProps(size)} className={className} aria-label="4 Mevsim lastiği">
      {/* sol: dolu yarım güneş diski */}
      <path className="mv-sun-filled" d="M12 7A5 5 0 0 0 12 17Z" />
      {/* sol: ışınlar */}
      <path
        className="mv-sun"
        strokeWidth={2.1}
        d="M9.36 5.63L8.36 3.22M5.63 9.36L3.22 8.36M5.63 14.64L3.22 15.64M9.36 18.37L8.36 20.78"
      />
      {/* sağ: kar tanesi kolları */}
      <path
        className="mv-snow"
        strokeWidth={1.7}
        d="M12 12L16.7 3.86M12 12L21.4 12M12 12L16.7 20.14"
      />
      {/* sağ: dış çıkıntılar */}
      <path
        className="mv-snow"
        strokeWidth={1.7}
        d="M17.52 5.84L15.2 6.46L14.58 4.14M20.1 13.7L18.4 12L20.1 10.3M14.58 19.86L15.2 17.54L17.52 18.16"
      />
      {/* sağ: iç çıkıntılar — ok işareti okunuşunu kırar */}
      <path
        className="mv-snow"
        strokeWidth={1.5}
        d="M15.44 8.59L13.7 9.06L13.23 7.32M16.67 13.27L15.4 12L16.67 10.73M13.23 16.68L13.7 14.94L15.44 15.41"
      />
    </svg>
  );
}

/** Jantta mevsim yoktur (mevsim null) — ikon yerine tire gösterilir. */
export function SeasonIcon({
  mevsim,
  size = 18,
}: {
  mevsim: string | null;
  size?: number;
}) {
  if (mevsim === null) return <span className="note">—</span>;
  if (mevsim === "kis") return <SnowIcon size={size} className="icon-winter" />;
  if (mevsim === "dortMevsim") return <DortMevsimIcon size={size} />;
  return <SunIcon size={size} className="icon-summer" />;
}

export function ChevronDownIcon({ size = 16, className }: IconProps) {
  return (
    <svg {...svgProps(size)} className={className}>
      <path d="M6 9.5 12 15.5 18 9.5" />
    </svg>
  );
}

export function WalletIcon({ size = 18, className }: IconProps) {
  return (
    <svg {...svgProps(size)} className={className}>
      <path d="M3 7.5A2.5 2.5 0 0 1 5.5 5H18a2 2 0 0 1 2 2v1" />
      <path d="M3 7.5v9A2.5 2.5 0 0 0 5.5 19H19a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2H5.5A2.5 2.5 0 0 1 3 7.5Z" />
      <circle cx="16.5" cy="14" r="1.1" fill="currentColor" stroke="none" />
    </svg>
  );
}
