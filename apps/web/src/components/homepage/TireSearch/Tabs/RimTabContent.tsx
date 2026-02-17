import React, { useState } from "react";

interface RimTabContentProps {
    selectedCap: string;
    setSelectedCap: (value: string) => void;
    selectedBijon: string;
    setSelectedBijon: (value: string) => void;
    jantCaplari: { value: string }[];
    bijonAraliklari: { value: string }[];
    handleJantArama: (e: React.FormEvent) => void;
}

export default function RimTabContent({
    selectedCap,
    setSelectedCap,
    selectedBijon,
    setSelectedBijon,
    jantCaplari,
    bijonAraliklari,
    handleJantArama,
}: RimTabContentProps) {
    const [imageError, setImageError] = useState(false);

    return (
        <div className="search_tabcontent">
            <div className="search_tabcontent_type">
                <ul className="nav nav-tabs mb-4" role="tablist">
                    <li className="nav-item" role="presentation">
                        <a
                            className="nav-link active justify-content-center px-0"
                            id="rim-size-tab"
                            data-bs-toggle="tab"
                            data-bs-target="#rim-size-tab-pane"
                            role="tab"
                            aria-controls="rim-size-tab-pane"
                            aria-selected="true">
                            <span className="d-none d-lg-block">Ebata Göre Jant Arama</span>
                            <span className="d-block d-lg-none">Ebata Göre</span>
                        </a>
                    </li>
                    <li className="nav-item" role="presentation">
                        <button
                            type="button"
                            onClick={() => {
                                const event = new Event('openRimSearchModal');
                                window.dispatchEvent(event);
                            }}
                            className="nav-link justify-content-center px-0"
                        >
                            <span className="d-none d-lg-block">Araca Göre Jant Arama</span>
                            <span className="d-block d-lg-none">Araca Göre</span>
                        </button>
                    </li>
                </ul>
                <div className="tab-content">
                    <div
                        className="tab-pane fade show active"
                        id="rim-size-tab-pane"
                        role="tabpanel"
                        aria-labelledby="rim-size-tab"
                    >
                        <form onSubmit={handleJantArama}>
                            <div className="row">
                                <div className="col-6 col-md-6 position-relative mb-4">
                                    <label htmlFor="rim_diameter" className="form-label text-muted fs-xs">
                                        Jant Çapı
                                    </label>
                                    <select
                                        className="form-select cursor-pointer"
                                        id="rim_diameter"
                                        value={selectedCap}
                                        style={{
                                            borderRadius: '0.375rem',
                                            border: '1px solid black'
                                        }}
                                        onChange={(e) => setSelectedCap(e.target.value)}
                                        required
                                    >
                                        <option value="">Seçiniz</option>
                                        {jantCaplari.map((c) => (
                                            <option key={c.value} value={c.value}>
                                                {c.value}"
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="col-6 col-md-6 position-relative mb-4">
                                    <label htmlFor="rim_pcd" className="form-label text-muted fs-xs">
                                        Bijon Aralığı
                                    </label>
                                    <select
                                        className="form-select cursor-pointer"
                                        id="rim_pcd"
                                        value={selectedBijon}
                                        style={{
                                            borderRadius: '0.375rem',
                                            border: '1px solid black'
                                        }}
                                        onChange={(e) => setSelectedBijon(e.target.value)}
                                    >
                                        <option value="">Tümü</option>
                                        {bijonAraliklari.map((b) => (
                                            <option key={b.value} value={b.value}>
                                                {b.value}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <div className="row align-items-end">
                                <div className="col-md-9 position-relative d-none d-lg-block">
                                </div>
                                <div className="col-12 col-md-3 position-relative pb-3">
                                    <button type="submit" className="btn btn-primary rounded-2 w-100">
                                        Uygun Jantları Bul
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}