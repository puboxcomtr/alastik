// LJA şube sayfalarının ortak parçaları (server component — tüm içerik sunucuda HTML olarak basılır)
import React from 'react';
import Link from 'next/link';
import type { Branch, BranchFaq } from '@/src/data/lja/subeler';
import type { ServiceGroup } from '@/src/data/lja/hizmetGruplari';
import { DAYS, AMENITY_LABELS, formatPrice, mapUrl, type BranchPoint, type ServiceRow } from '@/src/lib/ljaBranches';

export const ACCENT = '#e58a00';
export const DARK = '#313131';

// Adres, telefon, harita, çalışma saatleri, olanaklar
export function BranchInfoCard({ branch, point }: { branch: Branch; point: BranchPoint }) {
    return (
        <div className="card border-0 shadow-sm rounded-3 mb-4">
            <div className="card-body p-4">
                <h2 className="fs-5 fw-bold mb-3" style={{ color: ACCENT }}>
                    {branch.shortName} Şubesi İletişim
                </h2>
                <div className="mb-2 fw-semibold">{point.name}</div>
                {point.address && (
                    <div className="mb-2 d-flex gap-2">
                        <i className="ri-map-pin-line" style={{ color: DARK }} />
                        <span>{point.address}{point.district ? `, ${point.district}` : ''}{point.city ? ` / ${point.city}` : ''}</span>
                    </div>
                )}
                {point.phone && (
                    <div className="mb-3 d-flex gap-2">
                        <i className="ri-phone-line" style={{ color: DARK }} />
                        <a href={`tel:${point.phone.replace(/\s/g, '')}`} className="text-black fw-semibold text-decoration-none">
                            {point.phone}
                        </a>
                    </div>
                )}
                <div className="d-flex flex-wrap gap-2 mb-4">
                    <a href={mapUrl(branch)} target="_blank" rel="noopener" className="btn btn-dark btn-sm">
                        <i className="ri-direction-line me-1" />Yol Tarifi Al
                    </a>
                    {point.phone && (
                        <a href={`tel:${point.phone.replace(/\s/g, '')}`} className="btn btn-outline-dark btn-sm">
                            <i className="ri-phone-line me-1" />Hemen Ara
                        </a>
                    )}
                </div>

                <h3 className="fs-6 fw-bold mb-2">Çalışma Saatleri</h3>
                <table className="table table-sm mb-3">
                    <tbody>
                        {DAYS.map(d => {
                            const h = point.workingSchedule?.[d.key];
                            const open = h && h.open && h.close;
                            return (
                                <tr key={d.key}>
                                    <td className="ps-0">{d.label}</td>
                                    <td className="text-end pe-0">
                                        {open ? `${h!.open} - ${h!.close}` : <span className="text-danger">Kapalı</span>}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>

                {point.amenities?.length > 0 && (
                    <div className="d-flex flex-wrap gap-2">
                        {point.amenities.map(a => AMENITY_LABELS[a] && (
                            <span key={a} className="badge text-bg-light border fw-normal py-2 px-2">
                                <i className={`${AMENITY_LABELS[a].icon} me-1`} />{AMENITY_LABELS[a].label}
                            </span>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

// Hizmet fiyat tablosu (hizmet adı → ürün sayfası bağlantısı)
export function ServiceTable({ rows, caption }: { rows: ServiceRow[]; caption?: string }) {
    if (rows.length === 0) {
        return <p className="text-muted">Bu hizmet için güncel fiyat bilgisini şubemizden alabilirsiniz.</p>;
    }
    const hasFree = rows.some(r => r.price === 0);
    return (
        <div className="table-responsive">
            <table className="table table-striped align-middle mb-1">
                {caption && <caption className="small">{caption}</caption>}
                <thead>
                    <tr>
                        <th scope="col">Hizmet</th>
                        <th scope="col" className="text-end text-nowrap">Fiyat (KDV dahil)</th>
                    </tr>
                </thead>
                <tbody>
                    {rows.map((r, i) => (
                        <tr key={i}>
                            <td>
                                {r.url
                                    ? <Link href={r.url} className="text-black">{r.name}</Link>
                                    : r.name}
                            </td>
                            <td className="text-end fw-semibold text-nowrap">{formatPrice(r.price)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
            {hasFree && (
                <p className="small text-muted mb-0">* LastikJantAVM’den satın alınan lastiklerde şube montajı fiyata dahildir.</p>
            )}
        </div>
    );
}

export function FaqList({ faqs }: { faqs: BranchFaq[] }) {
    return (
        <div>
            {faqs.map((f, i) => (
                <div key={i} className={`py-3 ${i > 0 ? 'border-top' : ''}`}>
                    <h3 className="fs-6 fw-bold mb-1">{f.q}</h3>
                    <p className="mb-0">{f.a}</p>
                </div>
            ))}
        </div>
    );
}

// Şubedeki diğer hizmet gruplarına bağlantılar
export function GroupLinks({ branch, groups, currentSlug }: { branch: Branch; groups: ServiceGroup[]; currentSlug?: string }) {
    return (
        <ul className="list-unstyled mb-0 row row-cols-1 row-cols-md-2 g-2">
            {groups.filter(g => g.slug !== currentSlug).map(g => (
                <li key={g.slug} className="col">
                    <Link href={`/subeler/${branch.slug}/${g.slug}`} className="text-black">
                        {branch.shortName} {g.name}
                    </Link>
                </li>
            ))}
        </ul>
    );
}
