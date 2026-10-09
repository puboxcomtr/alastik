'use client';
// Montaj Noktası (Bayi) Bilgi ve Fiyat Formu — telefona göre tasarlanmış 5 adımlı form.
// Alanlar ve seçenekler API'den gelir (/api/bayi-formu/tanim); doğrulamanın asıl yeri sunucudur,
// buradaki kontroller yalnızca kullanıcıya hemen geri bildirim verir. Cevaplar tarayıcıda taslak olarak
// saklanır (sayfa yenilense de kaybolmaz), gönderim başarılı olunca taslak silinir.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { API_ENDPOINTS } from '@/src/config/api';

const API = API_ENDPOINTS.location.cities().replace(/\/location\/cities$/, '');
const BASLIK = { 'Content-Type': 'application/json', 'X-Site': 'lastikjantavm' };
const TASLAK = 'lja-bayi-formu-taslak-v1';
const KOYU = '#313131', VURGU = '#e4cc15';

type Satir = { kod: string; anahtar: string; ad: string; birim: string; secenekler: number[] };
type Tanim = {
    saatler: string[]; kapali: string; saatAlanlari: { key: string; etiket: string; kapaliOlabilir: boolean; es?: string }[];
    vermiyorum: string; vermiyorumEtiket: string; fiyatGruplari: { ad: string; satirlar: Satir[] }[];
    evetHayir: string[]; tesisEvetHayir: { key: string; soru: string; kisa: string }[];
    calisanSayisi: number[]; metrekare: number[]; lastikOteliYok: string; lastikOteliYokEtiket: string; lastikOteliKapasite: number[];
    markalar: string[]; markaYok: string; markaHepsi: string; markaDiger: string;
};
type Cevap = {
    bayiAdi: string; cityId: string; districtId: string; adres: string; telefon1: string; telefon2: string;
    saatler: Record<string, string>; fiyatlar: Record<string, string>; tesis: Record<string, any>; website: string;
};
const BOS: Cevap = { bayiAdi: '', cityId: '', districtId: '', adres: '', telefon1: '', telefon2: '', saatler: {}, fiyatlar: {}, tesis: { markalar: [] }, website: '' };
const ADIMLAR = ['Bayi Bilgileri', 'Çalışma Saatleri', 'Hizmet Fiyatları', 'Tesis Bilgileri', 'Özet ve Gönder'];

const CSS = `
.bf { width: 100%; max-width: 720px; margin: 0 auto; padding: 16px 14px 110px; color: #222; box-sizing: border-box; }
.bf h1 { font-size: 1.25rem; font-weight: 700; margin: 4px 0 6px; }
.bf h2 { font-size: 1.05rem; font-weight: 700; margin: 0 0 12px; }
.bf h3 { font-size: .95rem; font-weight: 700; margin: 18px 0 8px; padding-bottom: 6px; border-bottom: 2px solid ${VURGU}; }
.bf-adim { display: flex; gap: 6px; margin: 12px 0 16px; }
.bf-adim span { flex: 1; height: 6px; border-radius: 6px; background: #e5e5e5; }
.bf-adim span.t { background: ${KOYU}; } .bf-adim span.a { background: ${VURGU}; }
.bf-kart { background: #fff; border: 1px solid #e3e3e3; border-radius: 12px; padding: 14px; margin-bottom: 10px; }
.bf label { display: block; font-weight: 600; font-size: .92rem; margin-bottom: 6px; }
.bf small.ip { display: block; color: #6c757d; font-size: .8rem; margin: -2px 0 6px; font-weight: 400; }
.bf input[type=text], .bf input[type=tel], .bf textarea, .bf select { width: 100%; font-size: 16px; padding: 11px 12px; border: 1px solid #c9c9c9; border-radius: 10px; background: #fff; color: #111; }
.bf .hatali input, .bf .hatali textarea, .bf .hatali select, .bf .hatali .bf-ikili, .bf .hatali .bf-marka { border-color: #d62828; }
.bf .hatali input.bf-ara { border-color: #c9c9c9; }
.bf .hata { color: #d62828; font-size: .82rem; margin-top: 5px; }
.bf-ikili { display: flex; gap: 8px; border: 1px solid transparent; border-radius: 10px; }
.bf-ikili button { flex: 1; padding: 11px 8px; font-size: 16px; font-weight: 600; border: 1px solid #c9c9c9; border-radius: 10px; background: #fff; color: #111; }
.bf-ikili button.sec { background: ${KOYU}; color: #fff; border-color: ${KOYU}; }
.bf-iki { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.bf-marka { max-height: 300px; overflow-y: auto; border: 1px solid #c9c9c9; border-radius: 10px; padding: 4px 10px; }
.bf-marka label { display: flex; align-items: center; gap: 10px; font-weight: 500; padding: 9px 0; margin: 0; border-bottom: 1px solid #f0f0f0; }
.bf-marka label:last-child { border-bottom: 0; } .bf-marka input { width: 20px; height: 20px; flex: none; }
.bf-alt { position: fixed; left: 0; right: 0; bottom: 0; background: #fff; border-top: 1px solid #ddd; padding: 10px 14px calc(10px + env(safe-area-inset-bottom)); z-index: 1040; }
.bf-alt > div { max-width: 720px; margin: 0 auto; display: flex; gap: 10px; }
.bf-alt button { flex: 1; padding: 13px; font-size: 16px; font-weight: 700; border-radius: 10px; border: 1px solid ${KOYU}; background: #fff; color: ${KOYU}; }
.bf-alt button.ana { background: ${KOYU}; color: #fff; } .bf-alt button:disabled { opacity: .5; }
.bf-ozet { width: 100%; font-size: .9rem; } .bf-ozet td { padding: 6px 4px; border-bottom: 1px solid #f0f0f0; vertical-align: top; }
.bf-ozet td:first-child { color: #555; width: 56%; } .bf-ozet td:last-child { font-weight: 600; text-align: right; }
.bf-duzenle { background: none; border: 0; color: #111; text-decoration: underline; font-size: .85rem; font-weight: 600; padding: 0; float: right; }
.bf-uyari { background: #fff4f4; border: 1px solid #f1b5b5; color: #a11; border-radius: 10px; padding: 10px 12px; margin-bottom: 12px; font-size: .9rem; }
.bf-tuzak { position: absolute; left: -9999px; width: 1px; height: 1px; overflow: hidden; }
/* Masaüstü: geniş alan, yan yana alanlar, sabit alt çubuk yerine sayfa içi düğmeler (telefon görünümü değişmez) */
@media (min-width: 768px) {
  .bf { max-width: 980px; padding: 28px 24px 48px; }
  .bf h1 { font-size: 1.7rem; margin-bottom: 8px; }
  .bf h2 { font-size: 1.15rem; } .bf h3 { font-size: 1.05rem; margin-top: 26px; }
  .bf-adim { margin: 14px 0 22px; } .bf-adim span { height: 8px; }
  .bf-izgara { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; align-items: start; margin-bottom: 14px; }
  .bf-izgara.uc { grid-template-columns: 1fr 1fr 1fr; }
  .bf-izgara > .bf-kart { margin-bottom: 0; height: 100%; }
  .bf-izgara > .tam { grid-column: 1 / -1; }
  .bf-kart { padding: 18px; }
  .bf-marka { display: grid; grid-template-columns: repeat(4, 1fr); column-gap: 18px; max-height: 340px; }
  .bf-marka label { border-bottom: 0; padding: 7px 0; }
  .bf-alt { position: static; border-top: 0; background: transparent; padding: 22px 0 0; }
  .bf-alt > div { max-width: none; justify-content: flex-end; }
  .bf-alt button { flex: 0 0 220px; }
  .bf-ozet { font-size: .95rem; } .bf-ozet td:first-child { width: 62%; }
}
`;

const telefonYaz = (v: string) => { const d = v.replace(/\D/g, '').slice(0, 11); return [d.slice(0, 4), d.slice(4, 7), d.slice(7, 9), d.slice(9, 11)].filter(Boolean).join(' '); };
const telefonGecerli = (v: string) => /^0[2-5]\d{9}$/.test(v.replace(/\D/g, ''));

export default function DealerForm() {
    const [tanim, setTanim] = useState<Tanim | null>(null);
    const [iller, setIller] = useState<{ cityId: string; cityName: string }[]>([]);
    const [ilceler, setIlceler] = useState<{ districtId: string; districtName: string }[]>([]);
    const [c, setC] = useState<Cevap>(BOS);
    const [adim, setAdim] = useState(0);
    const [hata, setHata] = useState<Record<string, string>>({});
    const [yukHata, setYukHata] = useState('');
    const [gonderiliyor, setGonderiliyor] = useState(false);
    const [bitti, setBitti] = useState<null | { guncellendi: boolean }>(null);
    const [markaAra, setMarkaAra] = useState('');
    const taslakOkundu = useRef(false);
    const ust = useRef<HTMLDivElement>(null);

    useEffect(() => {
        try { const t = localStorage.getItem(TASLAK); if (t) { const j = JSON.parse(t); if (j && typeof j === 'object') setC({ ...BOS, ...j.c, tesis: { markalar: [], ...(j.c?.tesis || {}) }, website: '' }); if (Number.isInteger(j?.adim) && j.adim >= 0 && j.adim <= 4) setAdim(j.adim); } } catch { /* taslak okunamazsa boş başla */ }
        taslakOkundu.current = true;
        Promise.all([
            fetch(`${API}/bayi-formu/tanim`, { headers: BASLIK }).then(r => r.json()),
            fetch(API_ENDPOINTS.location.cities()).then(r => r.json())
        ]).then(([t, il]) => {
            if (!t?.success) throw new Error('tanım');
            setTanim(t.data);
            setIller((il?.data || []).slice().sort((a: any, b: any) => String(a.cityName).localeCompare(String(b.cityName), 'tr')));
        }).catch(() => setYukHata('Form yüklenemedi. İnternet bağlantınızı kontrol edip sayfayı yenileyin.'));
    }, []);

    useEffect(() => {
        if (!c.cityId) { setIlceler([]); return; }
        let iptal = false;
        fetch(API_ENDPOINTS.location.districts(c.cityId)).then(r => r.json()).then(d => { if (!iptal) setIlceler((d?.data || []).slice().sort((a: any, b: any) => String(a.districtName).localeCompare(String(b.districtName), 'tr'))); }).catch(() => { });
        return () => { iptal = true; };
    }, [c.cityId]);

    useEffect(() => { if (!taslakOkundu.current || bitti) return; try { localStorage.setItem(TASLAK, JSON.stringify({ c: { ...c, website: '' }, adim })); } catch { /* depolama doluysa yok say */ } }, [c, adim, bitti]);

    const satirlar = useMemo(() => tanim ? tanim.fiyatGruplari.flatMap(g => g.satirlar) : [], [tanim]);
    const yaz = (alan: keyof Cevap, v: any) => { setC(o => ({ ...o, [alan]: v })); setHata(h => { const { [alan]: _, ...k } = h; return k; }); };
    const yazAlt = (grup: 'saatler' | 'fiyatlar' | 'tesis', key: string, v: any) => { setC(o => ({ ...o, [grup]: { ...(o[grup] as any), [key]: v } })); setHata(h => { const { [`${grup}.${key}`]: _, ...k } = h; return k; }); };

    const saatSec = (key: string, v: string) => {
        if (!tanim) return; const a = tanim.saatAlanlari.find(x => x.key === key);
        setC(o => { const s = { ...o.saatler, [key]: v }; if (a?.es) { if (v === tanim.kapali) s[a.es] = tanim.kapali; else if (s[a.es] === tanim.kapali) s[a.es] = ''; } return { ...o, saatler: s }; });
        setHata(h => { const k = { ...h }; delete k[`saatler.${key}`]; if (a?.es) delete k[`saatler.${a.es}`]; return k; });
    };
    const markaSec = (m: string) => {
        if (!tanim) return;
        setC(o => {
            let l: string[] = o.tesis.markalar || [];
            if (l.includes(m)) l = l.filter(x => x !== m);
            else if (m === tanim.markaYok || m === tanim.markaHepsi) l = [m];
            else l = [...l.filter(x => x !== tanim.markaYok && x !== tanim.markaHepsi), m];
            return { ...o, tesis: { ...o.tesis, markalar: l } };
        });
        setHata(h => { const { ['tesis.markalar']: _, ...k } = h; return k; });
    };

    // Adım bazında istemci kontrolü (sunucudaki kuralların aynısı)
    const kontrol = (n: number): Record<string, string> => {
        const h: Record<string, string> = {}; if (!tanim) return h;
        if (n === 0) {
            if (c.bayiAdi.trim().length < 2) h.bayiAdi = 'Bayi adını yazın';
            if (!c.cityId) h.cityId = 'İl seçin';
            if (!c.districtId) h.districtId = 'İlçe seçin';
            if (c.adres.trim().length < 10) h.adres = 'Açık adresi yazın';
            if (!telefonGecerli(c.telefon1)) h.telefon1 = 'Telefonu 0511 111 11 11 biçiminde yazın';
            if (c.telefon2.trim() && !telefonGecerli(c.telefon2)) h.telefon2 = 'İkinci telefonu 0511 111 11 11 biçiminde yazın ya da boş bırakın';
        }
        if (n === 1) for (const a of tanim.saatAlanlari) if (!c.saatler[a.key]) h[`saatler.${a.key}`] = `${a.etiket} seçin`;
        if (n === 2) for (const r of satirlar) if (c.fiyatlar[r.anahtar] === undefined || c.fiyatlar[r.anahtar] === '') h[`fiyatlar.${r.anahtar}`] = 'Fiyat seçin ya da "Bu hizmeti vermiyorum" seçin';
        if (n === 3) {
            for (const a of tanim.tesisEvetHayir) if (!c.tesis[a.key]) h[`tesis.${a.key}`] = 'Evet ya da Hayır seçin';
            if (!c.tesis.calisanSayisi) h['tesis.calisanSayisi'] = 'Çalışan sayısını seçin';
            if (!(c.tesis.markalar || []).length) h['tesis.markalar'] = 'En az bir seçenek işaretleyin';
            if (!c.tesis.metrekare) h['tesis.metrekare'] = 'Metrekareyi seçin';
            if (!c.tesis.lastikOteliKapasite) h['tesis.lastikOteliKapasite'] = 'Lastik oteli kapasitesini seçin';
        }
        return h;
    };
    const adimOf = (alan: string) => alan.startsWith('saatler.') ? 1 : alan.startsWith('fiyatlar.') ? 2 : alan.startsWith('tesis.') ? 3 : 0;
    const git = (n: number) => { setAdim(n); setTimeout(() => ust.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 30); };
    const ilkHatayaGit = () => setTimeout(() => document.querySelector('.bf .hatali')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 60);

    const ileri = () => { const h = kontrol(adim); setHata(h); if (Object.keys(h).length) { ilkHatayaGit(); return; } git(adim + 1); };
    const gonder = async () => {
        let h: Record<string, string> = {}; for (let n = 0; n < 4; n++) h = { ...h, ...kontrol(n) };
        if (Object.keys(h).length) { setHata(h); git(Math.min(...Object.keys(h).map(adimOf))); ilkHatayaGit(); return; }
        setGonderiliyor(true);
        try {
            const r = await fetch(`${API}/bayi-formu`, { method: 'POST', headers: BASLIK, body: JSON.stringify(c) });
            const j = await r.json().catch(() => ({}));
            if (r.ok && j?.success) { try { localStorage.removeItem(TASLAK); } catch { /* yok say */ } setBitti({ guncellendi: !!j.guncellendi }); window.scrollTo({ top: 0 }); return; }
            if (j?.hatalar && Object.keys(j.hatalar).length) { setHata(j.hatalar); git(Math.min(...Object.keys(j.hatalar).map(adimOf))); ilkHatayaGit(); }
            else setHata({ genel: j?.message || 'Form gönderilemedi, lütfen tekrar deneyin' });
        } catch { setHata({ genel: 'Bağlantı kurulamadı. İnternetinizi kontrol edip tekrar deneyin; cevaplarınız saklandı.' }); }
        finally { setGonderiliyor(false); }
    };

    const A = ({ alan, etiket, ipucu, tam, children }: { alan: string; etiket: string; ipucu?: string; tam?: boolean; children: React.ReactNode }) => {
        // Tek bir giriş alanıysa etiketi ona bağla (ekran okuyucu ve etikete dokununca odaklanma için)
        const id = `bf-${alan.replace(/[^a-zA-Z0-9]/g, '-')}`;
        const tekAlan = React.isValidElement(children) && typeof children.type === 'string' && ['input', 'select', 'textarea'].includes(children.type);
        return (
        <div className={`bf-kart${hata[alan] ? ' hatali' : ''}${tam ? ' tam' : ''}`} key={alan}>
            <label htmlFor={tekAlan ? id : undefined}>{etiket}</label>
            {ipucu && <small className="ip">{ipucu}</small>}
            {tekAlan ? React.cloneElement(children as React.ReactElement<any>, { id }) : children}
            {hata[alan] && <div className="hata">{hata[alan]}</div>}
        </div>
        );
    };
    const para = (n: number) => `${n.toLocaleString('tr-TR')} TL`;
    const fiyatYazi = (v: any) => !tanim ? '' : v === tanim.vermiyorum ? tanim.vermiyorumEtiket : v ? para(Number(v)) : '';

    if (yukHata) return <div className="bf"><style>{CSS}</style><div className="bf-uyari">{yukHata}</div></div>;
    if (!tanim) return <div className="bf"><style>{CSS}</style><p>Form yükleniyor…</p></div>;
    if (bitti) return (
        <div className="bf"><style>{CSS}</style>
            <div className="bf-kart" style={{ textAlign: 'center', padding: '36px 18px' }}>
                <div style={{ fontSize: 44, lineHeight: 1 }}>✓</div>
                <h1 style={{ marginTop: 12 }}>Teşekkür ederiz</h1>
                <p style={{ margin: 0 }}>{bitti.guncellendi ? 'Bilgileriniz güncellendi.' : 'Formunuz bize ulaştı.'} Bilgilerinizde değişiklik olursa aynı linkten formu yeniden doldurabilirsiniz.</p>
            </div>
        </div>
    );

    const il = iller.find(i => i.cityId === c.cityId)?.cityName || ''; const ilce = ilceler.find(i => i.districtId === c.districtId)?.districtName || '';
    const filtreliMarka = tanim.markalar.filter(m => m.toLocaleLowerCase('tr').includes(markaAra.trim().toLocaleLowerCase('tr')));

    return (
        <div className="bf" ref={ust}>
            <style>{CSS}</style>
            <h1>Montaj Noktası Bilgi ve Fiyat Formu</h1>
            <div style={{ color: '#555', fontSize: '.9rem' }}>Adım {adim + 1} / {ADIMLAR.length}: <strong>{ADIMLAR[adim]}</strong></div>
            <div className="bf-adim" aria-hidden="true">{ADIMLAR.map((_, i) => <span key={i} className={i < adim ? 't' : i === adim ? 'a' : ''} />)}</div>
            {hata.genel && <div className="bf-uyari">{hata.genel}</div>}
            {adim < 4 && Object.keys(hata).filter(k => k !== 'genel' && adimOf(k) === adim).length > 0 && <div className="bf-uyari">Tüm alanlar zorunludur. Lütfen kırmızı ile işaretli alanları doldurun.</div>}
            <div className="bf-tuzak" aria-hidden="true"><label>Web siteniz<input type="text" tabIndex={-1} autoComplete="off" value={c.website} onChange={e => setC(o => ({ ...o, website: e.target.value }))} /></label></div>

            {adim === 0 && <div className="bf-izgara">
                {A({ alan: 'bayiAdi', etiket: 'Bayi Adı', tam: true, children: <input type="text" value={c.bayiAdi} maxLength={150} onChange={e => yaz('bayiAdi', e.target.value)} autoComplete="organization" /> })}
                {A({ alan: 'cityId', etiket: 'İl', children: <select value={c.cityId} onChange={e => { setC(o => ({ ...o, cityId: e.target.value, districtId: '' })); setHata(h => { const { cityId: _a, districtId: _b, ...k } = h; return k; }); }}><option value="">Seçiniz</option>{iller.map(i => <option key={i.cityId} value={i.cityId}>{i.cityName}</option>)}</select> })}
                {A({ alan: 'districtId', etiket: 'İlçe', children: <select value={c.districtId} disabled={!c.cityId} onChange={e => yaz('districtId', e.target.value)}><option value="">{c.cityId ? 'Seçiniz' : 'Önce il seçin'}</option>{ilceler.map(i => <option key={i.districtId} value={i.districtId}>{i.districtName}</option>)}</select> })}
                {A({ alan: 'adres', etiket: 'Açık Adres', ipucu: 'Mahalle, cadde/sokak, kapı numarası', tam: true, children: <textarea rows={3} value={c.adres} maxLength={500} onChange={e => yaz('adres', e.target.value)} /> })}
                {A({ alan: 'telefon1', etiket: 'Telefon', ipucu: 'Cep ya da sabit hat. Örnek: 0511 111 11 11', children: <input type="tel" inputMode="numeric" placeholder="0511 111 11 11" value={c.telefon1} onChange={e => yaz('telefon1', telefonYaz(e.target.value))} /> })}
                {A({ alan: 'telefon2', etiket: 'İkinci Telefon (isteğe bağlı)', children: <input type="tel" inputMode="numeric" placeholder="0212 111 11 11" value={c.telefon2} onChange={e => yaz('telefon2', telefonYaz(e.target.value))} /> })}
            </div>}

            {adim === 1 && <div className="bf-izgara uc">{[['Hafta İçi', 0], ['Cumartesi', 2], ['Pazar', 4]].map(([ad, i]) => {
                const ac = tanim.saatAlanlari[i as number], kp = tanim.saatAlanlari[(i as number) + 1]; const kapali = c.saatler[ac.key] === tanim.kapali;
                const sec = (a: typeof ac, etiket: string, kilit = false) => (
                    <div className={hata[`saatler.${a.key}`] ? 'hatali' : ''}>
                        <label>{etiket}</label>
                        <select value={c.saatler[a.key] || ''} disabled={kilit} onChange={e => saatSec(a.key, e.target.value)}>
                            <option value="">Seçiniz</option>
                            {a.kapaliOlabilir && <option value={tanim.kapali}>{tanim.kapali}</option>}
                            {tanim.saatler.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                        {hata[`saatler.${a.key}`] && <div className="hata">{hata[`saatler.${a.key}`]}</div>}
                    </div>
                );
                return <div className="bf-kart" key={ad as string}><h2>{ad}</h2><div className="bf-iki">{sec(ac, 'Açılış')}{sec(kp, 'Kapanış', kapali)}</div></div>;
            })}</div>}

            {adim === 2 && <>
                <p style={{ fontSize: '.9rem', color: '#555' }}>Fiyatlar <strong>KDV dahil</strong> TL’dir. Vermediğiniz hizmet için “{tanim.vermiyorumEtiket}” seçin.</p>
                {tanim.fiyatGruplari.map(g => <div key={g.ad}><h3>{g.ad}</h3><div className="bf-izgara">
                    {g.satirlar.map(r => A({ alan: `fiyatlar.${r.anahtar}`, etiket: r.ad, ipucu: r.birim, children: (
                        <select value={c.fiyatlar[r.anahtar] ?? ''} onChange={e => yazAlt('fiyatlar', r.anahtar, e.target.value)}>
                            <option value="">Fiyat seçiniz</option>
                            <option value={tanim.vermiyorum}>{tanim.vermiyorumEtiket}</option>
                            {r.secenekler.map(s => <option key={s} value={String(s)}>{para(s)}</option>)}
                        </select>) }))}
                </div></div>)}
            </>}

            {adim === 3 && <>
                <div className="bf-izgara uc">{tanim.tesisEvetHayir.map(a => A({ alan: `tesis.${a.key}`, etiket: a.soru, children: (
                    <div className="bf-ikili" key={a.key}>{tanim.evetHayir.map(v => <button type="button" key={v} className={c.tesis[a.key] === v ? 'sec' : ''} onClick={() => yazAlt('tesis', a.key, v)}>{v}</button>)}</div>) }))}</div>
                <div className="bf-izgara uc">
                {A({ alan: 'tesis.calisanSayisi', etiket: 'Çalışan kişi sayısı', children: <select value={c.tesis.calisanSayisi ?? ''} onChange={e => yazAlt('tesis', 'calisanSayisi', e.target.value)}><option value="">Seçiniz</option>{tanim.calisanSayisi.map(n => <option key={n} value={String(n)}>{n}</option>)}</select> })}
                {A({ alan: 'tesis.metrekare', etiket: 'İş yeri kaç metrekare?', children: <select value={c.tesis.metrekare ?? ''} onChange={e => yazAlt('tesis', 'metrekare', e.target.value)}><option value="">Seçiniz</option>{tanim.metrekare.map(n => <option key={n} value={String(n)}>{n} m²</option>)}</select> })}
                {A({ alan: 'tesis.lastikOteliKapasite', etiket: 'Lastik oteli kapasitesi kaç adet?', children: <select value={c.tesis.lastikOteliKapasite ?? ''} onChange={e => yazAlt('tesis', 'lastikOteliKapasite', e.target.value)}><option value="">Seçiniz</option><option value={tanim.lastikOteliYok}>{tanim.lastikOteliYokEtiket}</option>{tanim.lastikOteliKapasite.map(n => <option key={n} value={String(n)}>{n} adet</option>)}</select> })}
                </div>
                {A({ alan: 'tesis.markalar', etiket: 'Hangi marka bayisisiniz?', ipucu: 'Birden fazla seçebilirsiniz', tam: true, children: <>
                    <input type="text" className="bf-ara" aria-label="Marka ara" placeholder="Marka ara…" value={markaAra} onChange={e => setMarkaAra(e.target.value)} style={{ marginBottom: 8 }} />
                    <div className="bf-marka">
                        {!markaAra.trim() && [tanim.markaYok, tanim.markaHepsi].map(m => <label key={m}><input type="checkbox" checked={(c.tesis.markalar || []).includes(m)} onChange={() => markaSec(m)} /><strong>{m}</strong></label>)}
                        {filtreliMarka.map(m => <label key={m}><input type="checkbox" checked={(c.tesis.markalar || []).includes(m)} onChange={() => markaSec(m)} />{m}</label>)}
                        {!markaAra.trim() && <label><input type="checkbox" checked={(c.tesis.markalar || []).includes(tanim.markaDiger)} onChange={() => markaSec(tanim.markaDiger)} />{tanim.markaDiger}</label>}
                    </div>
                    {(c.tesis.markalar || []).length > 0 && <small className="ip" style={{ marginTop: 8 }}>Seçilen: {(c.tesis.markalar || []).join(', ')}</small>}
                </> })}
            </>}

            {adim === 4 && <>
                <p style={{ fontSize: '.9rem', color: '#555' }}>Cevaplarınızı kontrol edin. Doğruysa en alttaki <strong>Formu Gönder</strong> düğmesine basın.</p>
                <div className="bf-izgara">
                <div className="bf-kart"><button type="button" className="bf-duzenle" onClick={() => git(0)}>Düzenle</button><h2>Bayi Bilgileri</h2>
                    <table className="bf-ozet"><tbody>
                        <tr><td>Bayi Adı</td><td>{c.bayiAdi}</td></tr><tr><td>İl / İlçe</td><td>{il} / {ilce}</td></tr><tr><td>Açık Adres</td><td>{c.adres}</td></tr>
                        <tr><td>Telefon</td><td>{c.telefon1}</td></tr>{c.telefon2 && <tr><td>İkinci Telefon</td><td>{c.telefon2}</td></tr>}
                    </tbody></table></div>
                <div className="bf-kart"><button type="button" className="bf-duzenle" onClick={() => git(1)}>Düzenle</button><h2>Çalışma Saatleri</h2>
                    <table className="bf-ozet"><tbody>{[['Hafta İçi', 0], ['Cumartesi', 2], ['Pazar', 4]].map(([ad, i]) => { const a = c.saatler[tanim.saatAlanlari[i as number].key], k = c.saatler[tanim.saatAlanlari[(i as number) + 1].key]; return <tr key={ad as string}><td>{ad}</td><td>{a === tanim.kapali ? tanim.kapali : `${a || '—'} – ${k || '—'}`}</td></tr>; })}</tbody></table></div>
                </div>
                <div className="bf-kart"><button type="button" className="bf-duzenle" onClick={() => git(2)}>Düzenle</button><h2>Hizmet Fiyatları (KDV dahil)</h2>
                    <table className="bf-ozet"><tbody>{satirlar.map(r => <tr key={r.kod}><td>{r.ad}</td><td>{fiyatYazi(c.fiyatlar[r.anahtar]) || '—'}</td></tr>)}</tbody></table></div>
                <div className="bf-kart"><button type="button" className="bf-duzenle" onClick={() => git(3)}>Düzenle</button><h2>Tesis Bilgileri</h2>
                    <table className="bf-ozet"><tbody>
                        {tanim.tesisEvetHayir.map(a => <tr key={a.key}><td>{a.kisa}</td><td>{c.tesis[a.key] || '—'}</td></tr>)}
                        <tr><td>Çalışan sayısı</td><td>{c.tesis.calisanSayisi || '—'}</td></tr><tr><td>Marka bayiliği</td><td>{(c.tesis.markalar || []).join(', ') || '—'}</td></tr>
                        <tr><td>İş yeri</td><td>{c.tesis.metrekare ? `${c.tesis.metrekare} m²` : '—'}</td></tr>
                        <tr><td>Lastik oteli kapasitesi</td><td>{c.tesis.lastikOteliKapasite === tanim.lastikOteliYok ? tanim.lastikOteliYokEtiket : c.tesis.lastikOteliKapasite ? `${c.tesis.lastikOteliKapasite} adet` : '—'}</td></tr>
                    </tbody></table></div>
            </>}

            <div className="bf-alt"><div>
                {adim > 0 && <button type="button" onClick={() => git(adim - 1)} disabled={gonderiliyor}>Geri</button>}
                {adim < 4 ? <button type="button" className="ana" onClick={ileri}>İleri</button>
                    : <button type="button" className="ana" onClick={gonder} disabled={gonderiliyor}>{gonderiliyor ? 'Gönderiliyor…' : 'Formu Gönder'}</button>}
            </div></div>
        </div>
    );
}
