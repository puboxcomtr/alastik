import React, { useState } from "react";

interface ChainTabContentProps {
    selectedGenislik: string;
    setSelectedGenislik: (value: string) => void;
    selectedYukseklik: string;
    setSelectedYukseklik: (value: string) => void;
    selectedCap: string;
    setSelectedCap: (value: string) => void;
    genislikler: { value: string }[];
    yanakOranlari: { value: string }[];
    jantCaplari: { value: string }[];
    handleKarPaletiArama: (e: React.FormEvent) => void;
}

export default function ChainTabContent({
    selectedGenislik,
    setSelectedGenislik,
    selectedYukseklik,
    setSelectedYukseklik,
    selectedCap,
    setSelectedCap,
    genislikler,
    yanakOranlari,
    jantCaplari,
    handleKarPaletiArama,
}: ChainTabContentProps) {
    const [imageError, setImageError] = useState(false);

    return (
        <div className="search_tabcontent">
            <div className="search_tabcontent_type">
                <ul className="nav nav-tabs mb-4" role="tablist">
                    <li className="nav-item" role="presentation">
                        <a
                            className="nav-link active justify-content-center px-0"
                            id="chain-size-tab"
                            data-bs-toggle="tab"
                            data-bs-target="#chain-size-tab-pane"
                            role="tab"
                            aria-controls="chain-size-tab-pane"
                            aria-selected="true">
                            <span className="d-none d-lg-block">Ebata Göre Kar Paleti Arama</span>
                            <span className="d-block d-lg-none">Ebata Göre</span>
                        </a>
                    </li>
                    <li className="nav-item" role="presentation">
                        <button
                            type="button"
                            onClick={() => {
                                const event = new Event('openChainSearchModal');
                                window.dispatchEvent(event);
                            }}
                            className="nav-link justify-content-center px-0"
                        >
                            <span className="d-none d-lg-block">Araca Göre Kar Paleti Arama</span>
                            <span className="d-block d-lg-none">Araca Göre</span>
                        </button>
                    </li>
                </ul>
                <div className="tab-content">
                    <div
                        className="tab-pane fade show active"
                        id="chain-size-tab-pane"
                        role="tabpanel"
                        aria-labelledby="chain-size-tab"
                    >
                        <form onSubmit={handleKarPaletiArama}>
                            <div className="row">
                                <div className="col-4 col-md-4 position-relative mb-4">
                                    <label htmlFor="chain_width" className="form-label text-muted fs-xs">
                                        Genişlik
                                    </label>
                                    <select
                                        className="form-select"
                                        id="chain_width"
                                        value={selectedGenislik}
                                        onChange={(e) => setSelectedGenislik(e.target.value)}
                                        required
                                    >
                                        <option value="">Seçiniz</option>
                                        {genislikler.map((g) => (
                                            <option key={g.value} value={g.value}>
                                                {g.value}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="col-4 col-md-4 position-relative mb-4">
                                    <label htmlFor="chain_aspect" className="form-label text-muted fs-xs">
                                        Yanak
                                    </label>
                                    <select
                                        className="form-select"
                                        id="chain_aspect"
                                        value={selectedYukseklik}
                                        onChange={(e) => setSelectedYukseklik(e.target.value)}
                                        disabled={!selectedGenislik}
                                        required
                                    >
                                        <option value="">Seçiniz</option>
                                        {yanakOranlari.map((y) => (
                                            <option key={y.value} value={y.value}>
                                                {y.value}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="col-4 col-md-4 position-relative mb-4">
                                    <label htmlFor="chain_rim" className="form-label text-muted fs-xs">
                                        Jant Çapı
                                    </label>
                                    <select
                                        className="form-select"
                                        id="chain_rim"
                                        value={selectedCap}
                                        onChange={(e) => setSelectedCap(e.target.value)}
                                        disabled={!selectedYukseklik}
                                        required
                                    >
                                        <option value="">Seçiniz</option>
                                        {jantCaplari.map((c) => (
                                            <option key={c.value} value={c.value}>
                                                {c.value}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <div className="row align-items-end">
                                <div className="col-md-4 position-relative ps-0 pb-3">
                                    <a
                                        href="#"
                                        className="nav-link fs-xs d-flex text-decoration-underline text-muted justify-content-center justify-content-lg-start"
                                        role="button"
                                        data-bs-toggle="modal"
                                        data-bs-target="#rimSize"
                                    >
                                        Lastik ebatımı nasıl öğrenebilirim?
                                    </a>
                                </div>
                                <div className="col-md-5 position-relative d-none d-lg-block">
                                    {!imageError && (
                                        <img
                                            src="/assets/img/home/tyre-search.png"
                                            alt="Jant Arama"
                                            onError={() => setImageError(true)}
                                        />
                                    )}
                                </div>
                                <div className="col-12 col-md-3 position-relative pb-3">
                                    <button type="submit" className="btn btn-primary rounded-2 w-100">
                                        Uygun Kar Paletlerini Bul
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