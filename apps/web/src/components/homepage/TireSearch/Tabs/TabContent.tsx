import React from "react";

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
                    className="form-select"
                    id="rimsby_season"
                    name="rimby_season"
                    value={mevsim}
                    onChange={(e) => setMevsim(e.target.value)}
                  >
                    <option value="1">Tümü</option>
                    <option value="2">Yaz Lastiği</option>
                    <option value="3">Kış Lastiği</option>
                    <option value="4">4 Mevsim Lastiği</option>
                  </select>
                </div>
                <div className="col-4 col-md-2 position-relative mb-4">
                  <label
                    htmlFor="rimby_width"
                    className="form-label text-muted fs-xs"
                  >
                    Genişlik
                  </label>
                  <select
                    className="form-select"
                    id="rimby_width"
                    name="rimby_width"
                    value={selectedGenislik}
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
                <div className="col-4 col-md-2 position-relative mb-4">
                  <label
                    htmlFor="rimby_height"
                    className="form-label text-muted fs-xs"
                  >
                    Yükseklik
                  </label>
                  <select
                    className="form-select"
                    id="rimby_height"
                    name="rimby_height"
                    value={selectedYukseklik}
                    onChange={(e) => setSelectedYukseklik(e.target.value)}
                  >
                    <option value="">Seçiniz</option>
                    {yanakOranlari.map((y) => (
                      <option key={y.value} value={y.value}>
                        {y.value}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-4 col-md-3 position-relative mb-4">
                  <label
                    htmlFor="rimby_diameter"
                    className="form-label text-muted fs-xs"
                  >
                    Çap
                  </label>
                  <select
                    className="form-select"
                    id="rimby_diameter"
                    value={selectedCap}
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
                <div className="col-md-4 position-relative ps-0 pb-3">
                  <a
                    className="nav-link fs-xs d-flex text-decoration-underline text-muted justify-content-center justify-content-lg-start"
                    href="#"
                    role="button"
                    data-bs-toggle="modal"
                    data-bs-target="#tireSize"
                  >
                    Lastik ebatımı nasıl öğrenebilirim?
                  </a>
                </div>
                <div className="col-md-5 position-relative d-none d-lg-block">
                  <img
                    src="/assets/img/home/tyre-search.png"
                    alt="Site Adı - Resim Adı"
                  />
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
