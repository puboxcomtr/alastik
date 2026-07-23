import React, { useState } from "react";
import Autocomplete from '@mui/material/Autocomplete';
import TextField from '@mui/material/TextField';

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
  const TireWidth = '/alastik/assets/img/alastik-lastik-genisligi.png';
  const TireHeight = '/alastik/assets/img/alastik-lastik-yanak-genisligi.png';
  const TireRim = '/alastik/assets/img/alastik-lastik-jant-capi.png';

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
                    htmlFor="rimby_width"
                    className="form-label text-muted fs-xs d-flex align-items-center gap-1"
                  >
                    Mevsim
                    <span className="d-none d-lg-inline" style={{ cursor: 'pointer' }}>
                      <i className="ci-info fs-sm text-muted"></i>
                    </span>
                  </label>
                  <Autocomplete
                    id="rimsby_season"
                    options={[
                      { value: '1', label: 'Tümü' },
                      { value: '2', label: 'Yaz Lastiği' },
                      { value: '3', label: 'Kış Lastiği' },
                      { value: '4', label: '4 Mevsim Lastiği' }
                    ]}
                    getOptionLabel={(opt) => opt.label}
                    isOptionEqualToValue={(opt, val) => opt.value === val.value}
                    value={
                      [
                        { value: '1', label: 'Tümü' },
                        { value: '2', label: 'Yaz Lastiği' },
                        { value: '3', label: 'Kış Lastiği' },
                        { value: '4', label: '4 Mevsim Lastiği' }
                      ].find((o) => o.value === String(mevsim)) || null
                    }
                    onChange={(_, newVal) => setMevsim(newVal ? newVal.value : '1')}
                    disableClearable
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        placeholder="Seçiniz"
                      />
                    )}
                  />
                </div>
                <div
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
                  <Autocomplete
                    id="rimby_width"
                    options={genislikler}
                    getOptionLabel={(opt) => String(opt.value)}
                    isOptionEqualToValue={(opt, val) => String(opt.value) === String(val.value)}
                    value={genislikler.find((g) => String(g.value) === String(selectedGenislik)) || null}
                    onChange={(_, newVal) => setSelectedGenislik(newVal ? String(newVal.value) : '')}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        placeholder="Seçiniz"
                      />
                    )}
                  />
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
                  <Autocomplete
                    id="rimby_height"
                    options={yanakOranlari}
                    getOptionLabel={(opt) => String(opt.value)}
                    isOptionEqualToValue={(opt, val) => String(opt.value) === String(val.value)}
                    value={yanakOranlari.find((y) => String(y.value) === String(selectedYukseklik)) || null}
                    onChange={(_, newVal) => setSelectedYukseklik(newVal ? String(newVal.value) : '')}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        placeholder="Seçiniz"
                      />
                    )}
                  />
                </div>
                <div
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
                  <Autocomplete
                    id="rimby_diameter"
                    options={jantCaplari}
                    getOptionLabel={(opt) => String(opt.value)}
                    isOptionEqualToValue={(opt, val) => String(opt.value) === String(val.value)}
                    value={jantCaplari.find((c) => String(c.value) === String(selectedCap)) || null}
                    onChange={(_, newVal) => setSelectedCap(newVal ? String(newVal.value) : '')}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        placeholder="Seçiniz"
                      />
                    )}
                  />
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
