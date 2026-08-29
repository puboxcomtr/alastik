'use client';

// Montaj Noktaları: tam ekran harita + sol koyu panel (referans: bayi/satış noktası haritaları).
// Harita anahtarsız çalışır: Leaflet + Carto/OSM altlığı. Pinler LJA sarısı.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Container } from 'react-bootstrap';
import 'leaflet/dist/leaflet.css';
import type { Map as LeafletMap, Marker } from 'leaflet';
import { AMENITY_LABELS, DAYS, todayStatus, Stars, ServiceList, type MontagePoint } from './montageShared';

const BRAND_YELLOW = '#e4cc15';
const BRAND_DARK = '#313131';
const TURKEY_CENTER: [number, number] = [39.0, 35.3];

const PIN_SVG = `<svg width="34" height="44" viewBox="0 0 24 32" xmlns="http://www.w3.org/2000/svg">
<path d="M12 1C6 1 1.2 5.8 1.2 11.8c0 8.2 10.8 19 10.8 19s10.8-10.8 10.8-19C22.8 5.8 18 1 12 1z" fill="${BRAND_YELLOW}" stroke="${BRAND_DARK}" stroke-width="1.6"/>
<circle cx="12" cy="11.8" r="4.6" fill="${BRAND_DARK}"/></svg>`;


export default function MontageMap({ points }: { points: MontagePoint[] }) {
    const mapRef = useRef<LeafletMap | null>(null);
    const markersRef = useRef<Record<string, Marker>>({});
    const containerRef = useRef<HTMLDivElement | null>(null);
    const [search, setSearch] = useState('');
    // İstanbul varsayılan açık gelir (kullanıcı kararı)
    const [openCity, setOpenCity] = useState<string>('İstanbul');
    const [activeId, setActiveId] = useState<string>('');
    const [selected, setSelected] = useState<MontagePoint | null>(null);

    // İl bazlı gruplar (çok noktalı iller akordeon olur)
    const groups = useMemo(() => {
        const map = new Map<string, MontagePoint[]>();
        for (const p of points) {
            const key = p.city || 'Diğer';
            if (!map.has(key)) map.set(key, []);
            map.get(key)!.push(p);
        }
        // İstanbul, Ankara, İzmir en üstte; kalan iller alfabetik
        const PRIORITY: Record<string, number> = { 'İstanbul': 1, 'Ankara': 2, 'İzmir': 3 };
        return [...map.entries()]
            .map(([city, list]) => ({ city, list: list.sort((a, b) => a.name.localeCompare(b.name, 'tr')) }))
            .sort((a, b) => (PRIORITY[a.city] || 99) - (PRIORITY[b.city] || 99) || a.city.localeCompare(b.city, 'tr'));
    }, [points]);

    const filteredGroups = useMemo(() => {
        if (!search.trim()) return groups;
        const q = search.toLocaleLowerCase('tr-TR');
        return groups
            .map(g => ({
                city: g.city,
                list: g.list.filter(p => `${p.district} ${p.city}`.toLocaleLowerCase('tr-TR').includes(q))
            }))
            .filter(g => g.list.length > 0);
    }, [groups, search]);

    // Harita kurulumu
    useEffect(() => {
        let cancelled = false;
        (async () => {
            const L = (await import('leaflet')).default;
            if (cancelled || !containerRef.current || mapRef.current) return;

            const map = L.map(containerRef.current, { center: TURKEY_CENTER, zoom: 6, minZoom: 5, scrollWheelZoom: true });
            // Açılışta Türkiye'nin tamamı görünür şekilde sığdır
            map.fitBounds([[35.8, 25.6], [42.2, 44.9]], { padding: [8, 8] });
            L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
                maxZoom: 19
            }).addTo(map);

            const icon = L.divIcon({ html: PIN_SVG, className: 'lja-pin', iconSize: [34, 44], iconAnchor: [17, 42], popupAnchor: [0, -40] });
            const located = points.filter(p => p.location?.lat && p.location?.lng);
            for (const p of located) {
                const marker = L.marker([p.location!.lat!, p.location!.lng!], { icon }).addTo(map);
                // Pin tıklaması yan detay kartını açar (balon yok — nokta anonim)
                marker.on('click', () => { setActiveId(p._id); setSelected(p); });
                markersRef.current[p._id] = marker;
            }
            mapRef.current = map;
        })();
        return () => {
            cancelled = true;
            mapRef.current?.remove();
            mapRef.current = null;
            markersRef.current = {};
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const focusPoint = (p: MontagePoint) => {
        setActiveId(p._id);
        if (mapRef.current && p.location?.lat && p.location?.lng) {
            // Yakınlaştırma sınırlı: nokta anonim, harita yalnız bölgeye ilerler
            mapRef.current.flyTo([p.location.lat, p.location.lng], 11, { duration: 0.8 });
        }
    };

    return (
        <section id="montage__map" className="py-4">
            <Container>
                <div className={`mn-wrap${selected ? ' has-selected' : ''}`}>
                <div ref={containerRef} className="mn-map" />

                <aside className="mn-panel">
                    <div className="mn-panel-head">
                        <div className="mn-title">Montaj <span>Noktaları</span></div>
                        <input
                            className="mn-search"
                            placeholder="Nokta, il veya ilçe arayın..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                    </div>

                    <div className="mn-list">
                        {filteredGroups.length === 0 && (
                            <div className="mn-empty">Aramanızla eşleşen montaj noktası bulunamadı.</div>
                        )}
                        {filteredGroups.map(group => {
                            // Tüm iller akordeon: yalnız seçili il (varsayılan İstanbul) açık gelir; aramada hepsi açılır
                            const expanded = openCity === group.city || Boolean(search.trim());
                            return (
                                <div key={group.city}>
                                    <button
                                        type="button"
                                        className="mn-group"
                                        onClick={() => setOpenCity(openCity === group.city ? '' : group.city)}
                                    >
                                        <span>{group.city} ({group.list.length} Nokta)</span>
                                        <i className={expanded ? 'ri-arrow-up-s-line' : 'ri-arrow-down-s-line'} />
                                    </button>
                                    {expanded && group.list.map(p => (
                                        <div key={p._id} className={`mn-item ${activeId === p._id ? 'active' : ''}`} onClick={() => { focusPoint(p); setSelected(p); }} role="button" tabIndex={0}>
                                            <span className="mn-item-name">{p.isPublicInfo ? p.name : 'ANLAŞMALI NOKTA'}</span>
                                            <span className="mn-item-city">{p.city}{p.district ? ` / ${p.district}` : ''}</span>
                                            <span className="mn-item-rating">
                                                {p.rating.count > 0
                                                    ? <><Stars value={p.rating.average} size={13} /> <small>({p.rating.count})</small></>
                                                    : <small className='mn-noreview'>(Henüz Yorum Yapılmadı)</small>}
                                            </span>
                                            {p.startingPrice !== null && (
                                                <span className="mn-item-price">{p.startingPrice.toLocaleString('tr-TR')} TL'den başlayan fiyatlarla</span>
                                            )}
                                            <button
                                                type="button"
                                                className="mn-item-btn"
                                                onClick={e => { e.stopPropagation(); focusPoint(p); setSelected(p); }}
                                            >
                                                Hizmetleri Gör
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            );
                        })}
                    </div>
                </aside>

                {selected && (() => {
                    const status = todayStatus(selected);
                    const todayIndex = (new Date().getDay() + 6) % 7;
                    return (
                        <div className="mn-detail">
                            <button type="button" className="mn-detail-back" onClick={() => setSelected(null)}>
                                <i className="ri-arrow-left-line" /> Geri Dön
                            </button>
                            <div className="mn-detail-head">
                                <div>
                                    <div className="mn-detail-title">{selected.isPublicInfo ? selected.name : 'ANLAŞMALI NOKTA'}</div>
                                    <div className="mn-detail-city">{selected.city}{selected.district ? ` / ${selected.district}` : ''}</div>
                                    {selected.isPublicInfo && selected.address && (
                                        <div className="small mt-1 text-white">{selected.address}</div>
                                    )}
                                    {selected.isPublicInfo && selected.phone && (
                                        <div className="small mt-1"><a href={`tel:${selected.phone.replace(/\s/g, '')}`} className="text-decoration-none text-white">{selected.phone}</a></div>
                                    )}
                                    <div className="d-flex align-items-center gap-2 mt-1">
                                        {selected.rating.count > 0
                                            ? <><Stars value={selected.rating.average} size={14} /><small className="text-muted">{`${selected.rating.average} / 5 (${selected.rating.count} yorum)`}</small></>
                                            : <small className="text-muted">(Henüz Yorum Yapılmadı)</small>}
                                    </div>
                                </div>
                                <button type="button" className="mn-detail-close" onClick={() => setSelected(null)} aria-label="Kapat">
                                    <i className="ri-close-line" />
                                </button>
                            </div>

                            <div className="mn-detail-body">
                                <div className="mn-detail-services">
                                    <div className="fw-bold mb-1" style={{ color: '#fff' }}>Bu Noktadan Alabileceğiniz Hizmetler</div>
                                    {selected.services.length === 0 ? (
                                        <p className="text-muted small mb-0">Bu nokta için hizmet tanımı bulunmuyor.</p>
                                    ) : (
                                        <ServiceList services={selected.services} compact montagePointId={selected._id} />
                                    )}
                                </div>

                                {selected.amenities.length > 0 && (
                                    <div className="d-flex flex-wrap gap-2 mb-3">
                                        {selected.amenities.map(a => AMENITY_LABELS[a] && (
                                            <div key={a} className="mn-amenity text-center p-1" style={{ width: 74 }}>
                                                <i className={AMENITY_LABELS[a].icon} style={{ fontSize: 18, color: '#fff' }} />
                                                <div style={{ fontSize: 10 }}>{AMENITY_LABELS[a].label}</div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                <div className="mn-detail-hours">
                                    <span className="fw-bold" style={{ fontSize: 13 }}>Çalışma Saatleri</span>
                                    <div style={{ borderBottom: '1px solid #3a3a3a', margin: '8px 0' }} />
                                    <div style={{ fontSize: 12, color: '#bbb' }}>
                                        {DAYS.map((d, i) => {
                                            const h = selected.workingSchedule?.[d.key];
                                            const open = h && h.open && h.close;
                                            return (
                                                <div
                                                    key={d.key}
                                                    className={`d-flex justify-content-between ${i === todayIndex ? 'fw-bold' : ''}`}
                                                    style={{ padding: '5px 0', borderBottom: i < DAYS.length - 1 ? '1px solid #3a3a3a' : 'none' }}
                                                >
                                                    <span>{d.label}</span>
                                                    <span>{open ? `${h!.open} - ${h!.close}` : 'Kapalı'}</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                <p className="text-muted mt-3 mb-0" style={{ fontSize: 11 }}>
                                    Nokta bilgileri (ad, adres, telefon) hizmet satın alımınız tamamlandığında sipariş detayınızda paylaşılır.
                                </p>
                            </div>
                        </div>
                    );
                })()}
                </div>
            </Container>

            <style jsx>{`
                .mn-wrap {
                    position: relative; height: 640px; border-radius: 14px; overflow: hidden;
                    box-shadow: 0 6px 24px rgba(0,0,0,.12); border: 1px solid #e5e5e5;
                }
                .mn-map { position: absolute; inset: 0; z-index: 1; }
                .mn-panel {
                    position: absolute; top: 26px; left: 26px; bottom: 26px; width: 390px; z-index: 500;
                    background: #1c1c1c; border-radius: 14px; display: flex; flex-direction: column;
                    box-shadow: 0 10px 30px rgba(0,0,0,.35); overflow: hidden;
                }
                .mn-panel-head { padding: 18px 18px 14px; border-bottom: 1px solid #333; }
                .mn-title { color: #fff; font-weight: 800; font-size: 22px; letter-spacing: .5px; line-height: 1; }
                .mn-title span { color: #fff; }
                .mn-search {
                    margin-top: 12px; width: 100%; background: #2a2a2a; border: 1px solid #3a3a3a; color: #fff;
                    border-radius: 8px; padding: 8px 12px; font-size: 13px; outline: none;
                }
                .mn-search::placeholder { color: #777; }
                .mn-list { overflow-y: auto; padding: 12px; display: flex; flex-direction: column; gap: 8px; }
                .mn-group {
                    width: 100%; display: flex; justify-content: space-between; align-items: center;
                    background: ${BRAND_YELLOW}; color: ${BRAND_DARK}; font-weight: 700; font-size: 14px;
                    border: 0; border-radius: 8px; padding: 12px 14px; cursor: pointer; margin-bottom: 8px;
                }
                .mn-item {
                    width: 100%; text-align: left; background: #2a2a2a; border: 1px solid transparent; border-radius: 8px;
                    padding: 10px 14px; cursor: pointer; display: flex; flex-direction: column; gap: 2px; margin-bottom: 8px;
                }
                .mn-item:hover { background: #333; }
                .mn-item.active { border-color: ${BRAND_YELLOW}; background: #333; }
                .mn-item-name { color: ${BRAND_YELLOW}; font-weight: 700; font-size: 13px; letter-spacing: .4px; }
                .mn-item-city { color: #ddd; font-size: 13px; font-weight: 600; }
                .mn-item-rating { color: #ddd; font-size: 12px; display: flex; align-items: center; gap: 4px; }
                .mn-item-rating small { color: #ddd; }
                .mn-noreview { font-size: 11px; opacity: .55; }
                .mn-item-price { color: #ddd; font-size: 12px; font-weight: 600; }
                .mn-item-btn {
                    display: block; width: 100%; border: 0; margin-top: 6px; text-align: center;
                    background: #4a4a4a; color: #fff; font-weight: 700; font-size: 12px;
                    padding: 7px 10px; border-radius: 6px; text-decoration: none; cursor: pointer;
                }
                .mn-item-btn:hover { background: #5a5a5a; color: #fff; }
                .mn-empty { color: #999; font-size: 13px; padding: 12px; }
                .mn-detail {
                    position: absolute; top: 26px; right: 26px; bottom: 26px; width: 470px; z-index: 500;
                    background: #1c1c1c; color: #eee; border-radius: 14px; box-shadow: 0 10px 30px rgba(0,0,0,.35);
                    display: flex; flex-direction: column; overflow: hidden;
                }
                .mn-detail-head {
                    display: flex; justify-content: space-between; align-items: flex-start;
                    padding: 16px 16px 12px; border-bottom: 1px solid #333;
                }
                .mn-detail-title { color: ${BRAND_YELLOW}; font-weight: 800; font-size: 17px; letter-spacing: .3px; }
                .mn-detail-city { font-weight: 600; color: #fff; font-size: 13px; }
                .mn-service-divider { border-top: 2px solid rgba(255, 255, 255, .3); margin: 10px 0 4px; }
                .mn-detail-close {
                    background: #2a2a2a; border: 0; border-radius: 8px; width: 32px; height: 32px;
                    font-size: 18px; cursor: pointer; color: #fff;
                }
                .mn-detail-back {
                    display: none; width: 100%; text-align: left; background: #2a2a2a; color: #fff;
                    border: 0; padding: 12px 16px; font-weight: 600; font-size: 14px; cursor: pointer;
                }
                .mn-detail-body { overflow-y: auto; padding: 14px 16px; }
                .mn-detail-hours { background: #2a2a2a; border-radius: 8px; padding: 10px 12px; margin-bottom: 14px; }
                .mn-amenity { background: #2a2a2a; border: 1px solid #3a3a3a; border-radius: 8px; color: #ddd; }
                @media (max-width: 991px) {
                    /* Mobil: harita arka planda kalır, panel/hizmet kartı hafif padding ile üstüne biner.
                       Akış: önce liste; nokta seçilince liste yerine hizmet kartı (Geri Dön ile). */
                    .mn-wrap { height: 640px; }
                    .mn-map { position: absolute; inset: 0; }
                    .mn-panel { top: 8px; left: 8px; right: 8px; bottom: 8px; width: auto; }
                    .mn-detail { top: 8px; left: 8px; right: 8px; bottom: 8px; width: auto; }
                    .mn-wrap.has-selected .mn-panel { display: none; }
                    .mn-detail-back { display: block; }
                    .mn-detail-close { display: none; }
                }
                @media (min-width: 992px) {
                    .mn-detail-back { display: none; }
                }
            `}</style>
            <style jsx global>{`
                .lja-pin { background: transparent; border: 0; }
                .leaflet-popup-content { margin: 12px 14px; }
                /* Koyu panellerde ince, kibar kaydırma çubuğu */
                .mn-list, .mn-detail-body {
                    scrollbar-width: thin;
                    scrollbar-color: #4a4a4a transparent;
                }
                .mn-list::-webkit-scrollbar, .mn-detail-body::-webkit-scrollbar { width: 6px; }
                .mn-list::-webkit-scrollbar-track, .mn-detail-body::-webkit-scrollbar-track { background: transparent; }
                .mn-list::-webkit-scrollbar-thumb, .mn-detail-body::-webkit-scrollbar-thumb {
                    background: #4a4a4a; border-radius: 999px;
                }
                .mn-list::-webkit-scrollbar-thumb:hover, .mn-detail-body::-webkit-scrollbar-thumb:hover { background: #5f5f5f; }
                /* Koyu yan kart içinde bootstrap açık-tema sınıfları */
                .mn-detail .border-bottom { border-color: #333 !important; }
                .mn-detail .text-muted { color: #999 !important; }
                .mn-detail .form-select {
                    background-color: #2a2a2a; color: #fff; border-color: #3a3a3a;
                }
            `}</style>
        </section>
    );
}
