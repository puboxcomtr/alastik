"use client";

import type { Tire } from "@components/b2b-theme/lib/sample-data";

function WetIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 3s6 6.4 6 10.4A6 6 0 0 1 6 13.4C6 9.4 12 3 12 3z" fill="currentColor" />
    </svg>
  );
}

function NoiseIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 9v6h3l5 4V5L7 9H4z" fill="currentColor" stroke="none" />
      <path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8 8 0 0 1 0 12" />
    </svg>
  );
}

function FuelIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 21V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v16" />
      <path d="M4 21h13" />
      <path d="M9 10h4" />
      <path d="M15 8l2.5 2.5V17a1.8 1.8 0 0 0 3.5 0V9l-2.5-2.5" />
    </svg>
  );
}

export function AbLabel({ label }: { label: NonNullable<Tire["label"]> }) {
  return (
    <div className="ab-label-pop" role="tooltip">
      <div className="abl-title">AB LASTİK ETİKETİ</div>
      <div className="abl-rows">
        {label.yolTutus ? (
          <div className="abl-item">
            <div className="abl-head">
              <span className="abl-ic wet"><WetIcon /></span>
              <span className="abl-name">Yol Tutuş</span>
            </div>
            <div className="abl-val">{label.yolTutus}</div>
          </div>
        ) : null}
        {label.gurultu ? (
          <div className="abl-item">
            <div className="abl-head">
              <span className="abl-ic noise"><NoiseIcon /></span>
              <span className="abl-name">Gürültü</span>
            </div>
            <div className="abl-val">{label.gurultu}dB</div>
          </div>
        ) : null}
        {label.yakit ? (
          <div className="abl-item">
            <div className="abl-head">
              <span className="abl-ic fuel"><FuelIcon /></span>
              <span className="abl-name">Yakıt</span>
            </div>
            <div className="abl-val">{label.yakit}</div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
