import React from 'react';
import Link from 'next/link';
import { fmtKm } from '@/src/lib/geo';
import { pointLabel, type MontagePointLite } from '@/src/lib/locationData';
import { SERVICE_GROUPS } from '@/src/data/lja/hizmetGruplari';
import type { Branch } from '@/src/data/lja/subeler';

export const ACCENT = '#e58a00';

const sizeSlug = (s: string) => {
    const m = /^(\d{3})\/(\d{2})Z?R(\d{2}(?:\.\d)?)/i.exec(s);
    return m ? `/etiket/${m[1]}-${m[2]}-r${m[3]}-lastik-fiyatlari` : null;
};

export function Card({ title, children, id }: { title: string; children: React.ReactNode; id?: string }) {
    return (
        <div id={id} className="card border-0 shadow-sm rounded-3 p-4 mb-4">
            <h2 className="fs-5 fw-bold mb-3" style={{ color: ACCENT }}>{title}</h2>
            {children}
        </div>
    );
}

export function PointsTable({ rows, showKm }: { rows: { point: MontagePointLite; km?: number }[]; showKm: boolean }) {
    return (
        <div className="table-responsive">
            <table className="table table-striped align-middle small mb-1">
                <thead>
                    <tr>
                        <th>Montaj noktası</th>
                        <th>İl / İlçe</th>
                        {showKm && <th className="text-end">Uzaklık</th>}
                        <th className="text-end">Hizmet</th>
                    </tr>
                </thead>
                <tbody>
                    {rows.map(({ point, km }) => (
                        <tr key={point._id}>
                            <td><Link href={`/montaj-noktalari/${point._id}`} className="text-black">{pointLabel(point)}</Link></td>
                            <td>{`${point.city}${point.district ? ` / ${point.district}` : ''}`}</td>
                            {showKm && <td className="text-end text-nowrap">{km !== undefined ? fmtKm(km) : '-'}</td>}
                            <td className="text-end">{point.services?.length || 0}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
            {showKm && <p className="small text-muted mb-0">Uzaklıklar kuş uçuşu ve yaklaşıktır.</p>}
        </div>
    );
}

export function TopSizes({ sizes, regionName }: { sizes: string[]; regionName: string }) {
    if (!sizes.length) return null;
    return (
        <Card title={`${regionName} Bölgesinde En Çok Tercih Edilen Lastik Ebatları`}>
            <p className="small text-muted">Bu bölgeye gönderilen siparişlerden (toplu ve anonim) hesaplanmıştır.</p>
            <div className="d-flex flex-wrap gap-2">
                {sizes.map(s => {
                    const href = sizeSlug(s);
                    return href
                        ? <Link key={s} href={href} className="btn btn-outline-dark btn-sm">{`${s} lastik`}</Link>
                        : <span key={s} className="badge text-bg-light border">{s}</span>;
                })}
            </div>
        </Card>
    );
}

export function BranchBox({ branch, km, placeName }: { branch: Branch; km: number; placeName: string }) {
    return (
        <Card title={`${placeName} için En Yakın Şubemiz: ${branch.shortName}`}>
            <p>
                {`${branch.title} ${placeName} bölgesine yaklaşık ${fmtKm(km)} uzaklıktadır. Lastik montajı, tamiri ve ayar işlemleri için şubemize gelebilirsiniz.`}
            </p>
            <div className="d-flex flex-wrap gap-2">
                {SERVICE_GROUPS.slice(0, 6).map(g => (
                    <Link key={g.slug} href={`/subeler/${branch.slug}/${g.slug}`} className="btn btn-outline-dark btn-sm">{g.name}</Link>
                ))}
                <Link href={`/subeler/${branch.slug}`} className="btn btn-dark btn-sm">Şube bilgileri ve fiyatlar</Link>
            </div>
        </Card>
    );
}

export function LinkGrid({ links }: { links: { href: string; label: string; extra?: string }[] }) {
    return (
        <ul className="list-unstyled row row-cols-2 row-cols-md-3 row-cols-lg-4 g-1 small mb-0">
            {links.map(l => (
                <li key={l.href} className="col">
                    <Link href={l.href} className="text-black">{l.label}</Link>
                    {l.extra && <span className="text-muted">{` (${l.extra})`}</span>}
                </li>
            ))}
        </ul>
    );
}
