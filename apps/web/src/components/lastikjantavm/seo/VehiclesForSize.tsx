// "Bu ebadı kullanan araçlar" (server component) — ebat (etiket) ve lastik ürün sayfalarında.
// Ziyaretçiye tek satırlık kapalı bir başlık olarak görünür (<details>); açınca modeller listelenir.
// Bağlantılar sunucu HTML'inde bulunur. Yalnızca dizine açık araç sayfalarına bağlantı verilir.
import React from 'react';
import Link from 'next/link';
import { getVehiclesBySize } from '@/src/services/vehicleService';

const MAX = 48;

export default async function VehiclesForSize({ sizeKey, sizeLabel }: { sizeKey: string; sizeLabel: string }) {
    if (!/^\d{3}-\d{2}-r\d{2}(\.\d)?$/i.test(sizeKey)) return null;
    const vehicles = (await getVehiclesBySize(sizeKey.toLowerCase())).filter(v => v.indexable);
    if (vehicles.length === 0) return null;

    return (
        <details className="my-2 small">
            <summary className="text-muted">{`${sizeLabel} ebadını kullanan araçlar (${vehicles.length})`}</summary>
            <div className="pt-2">
                {vehicles.slice(0, MAX).map((v, i) => (
                    <React.Fragment key={`${v.makeSlug}/${v.modelSlug}`}>
                        {i > 0 && ' · '}
                        <Link href={`/arac/${v.makeSlug}/${v.modelSlug}`} className="text-reset">
                            {`${v.makeName} ${v.modelName}`}
                        </Link>
                    </React.Fragment>
                ))}
            </div>
        </details>
    );
}
