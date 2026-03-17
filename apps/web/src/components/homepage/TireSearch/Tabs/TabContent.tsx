import React, { useState } from "react";


export default function TabContent({
  mevsim,
  setMevsim,
  selectedGenislik,
  setSelectedGenislik,
  selectedYukseklik,
  setSelectedYukseklik,
  selectedCap,
  setSelectedCap,
  genislikler,
  yanakOranlari,
  jantCaplari,
  handleJantaGoreArama,
}) {

  const [hoveredTooltip, setHoveredTooltip] = useState(null);
  const TireWidth = '/assets/img/alastik-lastik-genisligi.png';
  const TireHeight = '/assets/img/alastik-lastik-yanak-genisligi.png';
  const TireRim = '/assets/img/alastik-lastik-jant-capi.png';

  return (
    <div className="search_tabcontent">
      <div className="search_tabcontent_type">
        <ul className="nav nav-tabs mb-4" role="tablist">
          <li className="nav-item" role="presentation">
            <a
              className="nav-link active justify-content-center px-0"
              id="rims-tab"
              data-bs-toggle="tab"
              data-bs-target="#rims-tab-pane"
              role="tab"
              aria-controls="rims-tab-pane"
              aria-selected="true"
            >
              <span className="d-none d-lg-block">Ebata Göre Lastik Arama</span>
              <span className="d-block d-lg-none">Ebata Göre Lastik</span>
            </a>
          </li>
          <li className="nav-item" role="presentation">
            <button
              onClick={() => {
                const event = new Event('openTireSearchModal');
                window.dispatchEvent(event);
              }}
              className="nav-link justify-content-center px-0"
            >
              <span className="d-none d-lg-block">Araca Göre Lastik Arama</span>
              <span className="d-block d-lg-none">Araca Göre Lastik</span>
            </button>
          </li>
        </ul>
        <div className="tab-content">
          <div
            className="tab-pane fade show active"
            id="rims-tab-pane"
            role="tabpanel"
            aria-labelledby="rims-tab"
          >
            <form onSubmit={handleJantaGoreArama}>
              <div className="row">
                <div className="col-12 col-md-5 position-relative mb-4">
                  <label
                    htmlFor="rimsby_season"
                    className="form-label text-muted fs-xs"
                  >
                    Mevsim
                  </label>
                  <select
                    className="form-select cursor-pointer"
                    id="rimsby_season"
                    name="rimby_season"
                    value={mevsim}
                    style={{
                      borderRadius: '0.375rem',
                      border: '1px solid black'
                    }}
                    onChange={(e) => setMevsim(e.target.value)}
                  >
                    <option value="1">Tümü</option>
                    <option value="2">Yaz Lastiği</option>
                    <option value="3">Kış Lastiği</option>
                    <option value="4">4 Mevsim Lastiği</option>
                  </select>
                </div><div
                  className="col-4 col-md-2 position-relative mb-4"
                  onMouseEnter={() => setHoveredTooltip('genislik')}
                  onMouseLeave={() => setHoveredTooltip(null)}
                >
                  <label
                    htmlFor="rimby_width"
                    className="form-label text-muted fs-xs d-flex align-items-center gap-1"
                  >
                    Genişlik
                    <span className="d-none d-lg-inline" style={{ cursor: 'pointer' }}>
                      <i className="ci-info fs-sm text-muted"></i>
                    </span>
                  </label>
                  {hoveredTooltip === 'genislik' && (
                    <span className="d-none d-lg-block" style={{
                      position: 'absolute',
                      bottom: '100%',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      zIndex: 9999,
                      background: '#fff',
                      borderRadius: '12px',
                      boxShadow: '0 8px 30px rgba(0,0,0,0.15)',
                      padding: '12px',
                      minWidth: '300px',
                      marginBottom: '4px'
                    }}>
                      <img src={TireWidth} alt="Lastik Genişlik" style={{ width: '298px', height: 'auto', display: 'block' }} />
                    </span>
                  )}
                  <select
                    className="form-select cursor-pointer"
                    id="rimby_width"
                    name="rimby_width"
                    value={selectedGenislik}
                    style={{
                      borderRadius: '0.375rem',
                      border: '1px solid black'
                    }}
                    onChange={(e) => setSelectedGenislik(e.target.value)}
                  >
                    <option value="">Seçiniz</option>
                    {genislikler.map((g) => (
                      <option key={g.value} value={g.value}>
                        {g.value}
                      </option>
                    ))}
                  </select>
                </div>
                <div
                  className="col-4 col-md-2 position-relative mb-4"
                  onMouseEnter={() => setHoveredTooltip('yukseklik')}
                  onMouseLeave={() => setHoveredTooltip(null)}
                >
                  <label
                    htmlFor="rimby_height"
                    className="form-label text-muted fs-xs d-flex align-items-center gap-1"
                  >
                    Yanak
                    <span className="d-none d-lg-inline" style={{ cursor: 'pointer' }}>
                      <i className="ci-info fs-sm text-muted"></i>
                    </span>
                  </label>
                  {hoveredTooltip === 'yukseklik' && (
                    <span className="d-none d-lg-block" style={{
                      position: 'absolute',
                      bottom: '100%',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      zIndex: 9999,
                      background: '#fff',
                      borderRadius: '12px',
                      boxShadow: '0 8px 30px rgba(0,0,0,0.15)',
                      padding: '12px',
                      minWidth: '300px',
                      marginBottom: '4px'
                    }}>
                      <img src={TireHeight} alt="Lastik Yükseklik" style={{ width: '298px', height: 'auto', display: 'block' }} />
                    </span>
                  )}
                  <select
                    className="form-select cursor-pointer"
                    id="rimby_height"
                    name="rimby_height"
                    value={selectedYukseklik}
                    style={{
                      borderRadius: '0.375rem',
                      border: '1px solid black'
                    }}
                    onChange={(e) => setSelectedYukseklik(e.target.value)}
                  >
                    <option value="">Seçiniz</option>
                    {yanakOranlari.map((y) => (
                      <option key={y.value} value={y.value}>
                        {y.value}
                      </option>
                    ))}
                  </select>
                </div><div
                  className="col-4 col-md-3 position-relative mb-4"
                  onMouseEnter={() => setHoveredTooltip('cap')}
                  onMouseLeave={() => setHoveredTooltip(null)}
                >

                  <label
                    htmlFor="rimby_diameter"
                    className="form-label text-muted fs-xs d-flex align-items-center gap-1"
                  >
                    Çap
                    <span className="d-none d-lg-inline" style={{ cursor: 'pointer' }}>
                      <i className="ci-info fs-sm text-muted"></i>
                    </span>
                  </label>
                  {hoveredTooltip === 'cap' && (
                    <span className="d-none d-lg-block" style={{
                      position: 'absolute',
                      bottom: '100%',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      zIndex: 9999,
                      background: '#fff',
                      borderRadius: '12px',
                      boxShadow: '0 8px 30px rgba(0,0,0,0.15)',
                      padding: '12px',
                      minWidth: '300px',
                      marginBottom: '4px'
                    }}>
                      <img src={TireRim} alt="Lastik Çapı" style={{ width: '298px', height: 'auto', display: 'block' }} />
                    </span>
                  )}
                  <select
                    className="form-select cursor-pointer"
                    id="rimby_diameter"
                    value={selectedCap}
                    style={{
                      borderRadius: '0.375rem',
                      border: '1px solid black'
                    }}
                    onChange={(e) => setSelectedCap(e.target.value)}
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
                <div className="d-none d-md-block col-md-4 position-relative ps-0 pb-3">
                  <button
                    type="button"
                    onClick={() => {
                      const event = new Event('openTireSizeModal');
                      window.dispatchEvent(event);
                    }}
                    className="d-none d-lg-flex nav-link fs-xs text-decoration-underline text-muted justify-content-center justify-content-lg-start bg-transparent border-0 p-0"
                  >
                    Lastik ebatımı nasıl öğrenebilirim?
                  </button>
                </div>
                <div className="col-md-5 position-relative d-none d-lg-block">
                </div>
                <div className="col-12 col-md-3 position-relative pb-3">
                  <button
                    type="submit"
                    className="btn btn-primary rounded-2 w-100">
                    Uygun Lastikleri Bul
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
