"use client";

import Link from "next/link";
import { PageHeaderProps } from '@/src/types/category';

export default function PageHeader({
    tip,
    genelArama,
    kategori,
    marka,
    genislik,
    yanak,
    cap,
    vehicleInfo,
    selectedSize,
    totalCount,
}: PageHeaderProps) {
    return (
        <div className="d-flex flex-column flex-sm-row align-items-start align-items-sm-center justify-content-between mb-4 pb-2">
            <div>
                {/* Başlık */}
                <h1 className="h2 mb-2">
                    {tip === "genel" && genelArama ? (
                        `"${genelArama}" ARAMA SONUÇLARI`
                    ) : tip === "kategori" && kategori ? (
                        `${kategori === "yaz"
                            ? "YAZ"
                            : kategori === "kis"
                                ? "KIŞ"
                                : kategori === "4mevsim" || kategori === "4-mevsim"
                                    ? "4 MEVSİM"
                                    : kategori === "runflat"
                                        ? "RUNFLAT"
                                        : kategori === "seal"
                                            ? "SEAL"
                                            : kategori === "xl-rf"
                                                ? "XL-RF"
                                                : kategori.toUpperCase()
                        } LASTİKLERİ${marka ? ` - ${marka.toUpperCase()}` : ""}`
                    ) : tip === "arac" && vehicleInfo ? (
                        `${vehicleInfo.marka?.toUpperCase()} ${vehicleInfo.model?.toUpperCase()} ${vehicleInfo.yil} LASTİKLERİ`
                    ) : tip === "jant" && genislik && yanak && cap ? (
                        `${genislik}/${yanak}R${cap} LASTİKLER`
                    ) : (
                        "LASTİKLER"
                    )}
                </h1>

                {/* Alt açıklama */}
                {(selectedSize || (tip === "genel" && genelArama)) && (
                    <p className="text-muted mb-0" style={{ fontSize: "0.9rem" }}>
                        {tip === "genel" && genelArama ? (
                            `"${genelArama}" araması için ${totalCount} sonuç bulundu`
                        ) : selectedSize ? (
                            `${selectedSize.ebat} ebadında ${totalCount} sonuç bulundu${vehicleInfo &&
                            ` • ${vehicleInfo.name || vehicleInfo.modifikasyon} için uygun`
                            }`
                        ) : (
                            ""
                        )}
                    </p>
                )}
            </div>
            {/* Aracı Değiştir Butonu */}
            {vehicleInfo && (
                <Link href="/" className="btn btn-outline-primary">
                    <i className="ci-arrow-left me-1"></i>ARACI DEĞİŞTİR
                </Link>
            )}
        </div>
    );
}
