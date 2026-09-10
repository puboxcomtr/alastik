'use client';
// B2B giriş ekranı — b2b.lastikjantavm.com/b2b düzeni referans alınmıştır.
// İki sekme: Giriş Yap / Yeni Başvuru Formu. Arka plan SLIDER'dır (8 Eyl kararı):
// public/b2b/ altındaki görseller sırayla yumuşak geçişle döner; görselleri
// değiştirmek için dosyaları güncelleyin / listeye ekleyin.
import { useEffect, useState } from 'react';
import { SITES } from '@src/config/siteConfig';
import { API_ENDPOINTS } from '@src/config/api';
import { toast } from 'react-toastify';

// Arka plan slider görselleri — public/b2b/ altındaki dosyalar
const LOGIN_BG_IMAGES = [
    '/b2b/login-bg-1.jpg',
    '/b2b/login-bg-2.jpg',
    '/b2b/login-bg-3.jpg',
];
const SLIDE_INTERVAL_MS = 6000;

type TabKey = 'login' | 'apply';

const site = SITES.b2b;

const inputStyle: React.CSSProperties = {
    width: '100%',
    background: '#242424',
    border: '1px solid #3d3d3d',
    borderRadius: 6,
    padding: '11px 14px',
    color: '#ffffff',
    fontSize: 14,
    outline: 'none',
};

const requiredMark = <span style={{ color: '#e05252' }}> *</span>;

const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: 12,
    color: '#c9c9c9',
    marginBottom: 6,
};

const B2BLogin = () => {
    const [tab, setTab] = useState<TabKey>('login');
    const [bgIndex, setBgIndex] = useState(0);
    const [submitting, setSubmitting] = useState(false);

    // Başvuru formu alanları — başvuru yalnız FORMDUR (hesap/şifre oluşturmaz;
    // bayilik DIA tarafında açılır — 8 Eyl kararı). Bildirimler toast ile verilir.
    const [apply, setApply] = useState({
        contactName: '', email: '', phone: '',
        cityId: '', city: '', district: '', address: '',
        companyName: '', taxOffice: '', taxNumber: '',
        yearsOfExperience: '', monthlySalesVolume: '', brands: [] as string[], wantsBrandedSignage: '',
        message: '', termsAccepted: false
    });
    const setApplyField = (field: string, value: string | boolean | string[]) => setApply(a => ({ ...a, [field]: value }));

    // Calistiginiz markalar — coklu secim (autocomplete); liste marka veritabanindan gelir
    const [brandOptions, setBrandOptions] = useState<string[]>([]);
    const [brandQuery, setBrandQuery] = useState('');
    const [brandOpen, setBrandOpen] = useState(false);

    useEffect(() => {
        fetch(API_ENDPOINTS.b2b.brands())
            .then(r => r.json())
            .then(d => {
                const items = (d?.data || []).map((b: any) => b?.name).filter(Boolean);
                setBrandOptions(items);
            })
            .catch(() => {});
    }, []);

    const filteredBrands = brandOptions.filter(b =>
        !apply.brands.includes(b) && b.toLocaleLowerCase('tr').includes(brandQuery.toLocaleLowerCase('tr'))
    );

    const addBrand = (brand: string) => {
        setApply(a => ({ ...a, brands: [...a.brands, brand] }));
        setBrandQuery('');
    };

    const removeBrand = (brand: string) => {
        setApply(a => ({ ...a, brands: a.brands.filter(b => b !== brand) }));
    };

    // Telefon maskesi: +90 5xx xxx xx xx
    const formatPhone = (value: string) => {
        let digits = value.replace(/\D/g, '');
        if (digits.startsWith('90')) digits = digits.slice(2);
        if (digits.startsWith('0')) digits = digits.slice(1);
        digits = digits.slice(0, 10);
        let out = '+90';
        if (digits.length > 0) out += ' ' + digits.slice(0, 3);
        if (digits.length > 3) out += ' ' + digits.slice(3, 6);
        if (digits.length > 6) out += ' ' + digits.slice(6, 8);
        if (digits.length > 8) out += ' ' + digits.slice(8, 10);
        return out;
    };

    // İl/ilçe listeleri adres veritabanından gelir (address_cities / address_districts)
    const [cities, setCities] = useState<{ cityId: string; cityName: string }[]>([]);
    const [districts, setDistricts] = useState<{ districtId: string; districtName: string }[]>([]);

    useEffect(() => {
        fetch(API_ENDPOINTS.location.cities())
            .then(r => r.json())
            .then(d => { if (d?.success) setCities(d.data || []); })
            .catch(() => {});
    }, []);

    useEffect(() => {
        if (!apply.cityId) { setDistricts([]); return; }
        fetch(API_ENDPOINTS.location.districts(apply.cityId))
            .then(r => r.json())
            .then(d => { if (d?.success) setDistricts(d.data || []); })
            .catch(() => {});
    }, [apply.cityId]);

    const handleCityChange = (cityId: string) => {
        const secilen = cities.find(c => c.cityId === cityId);
        setApply(a => ({ ...a, cityId, city: secilen?.cityName || '', district: '' }));
    };

    // Arka plan slider döngüsü
    useEffect(() => {
        const timer = setInterval(() => {
            setBgIndex((current) => (current + 1) % LOGIN_BG_IMAGES.length);
        }, SLIDE_INTERVAL_MS);
        return () => clearInterval(timer);
    }, []);

    // Giriş: cari kodu VEYA e-posta + şifre
    const [loginId, setLoginId] = useState('');
    const [loginPassword, setLoginPassword] = useState('');
    const [loggingIn, setLoggingIn] = useState(false);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoggingIn(true);
        try {
            const res = await fetch(API_ENDPOINTS.b2b.login(), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ identifier: loginId, password: loginPassword }),
            });
            const data = await res.json();
            if (data?.success && data.data?.token) {
                localStorage.setItem('authToken', data.data.token);
                document.cookie = `authToken=${data.data.token}; path=/; max-age=${30 * 24 * 60 * 60}`;
                toast.success('Giriş başarılı, yönlendiriliyorsunuz...');
                setTimeout(() => { window.location.href = '/'; }, 600);
            } else {
                toast.error(data?.message || 'Giriş yapılamadı.');
            }
        } catch {
            toast.error('Giriş yapılamadı, lütfen tekrar deneyin.');
        } finally {
            setLoggingIn(false);
        }
    };

    const handleApply = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            // Yetkili Ad Soyad tek alandan gonderilir; son kelime soyad kabul edilir
            const words = apply.contactName.trim().split(/\s+/);
            const payload = {
                ...apply,
                firstName: words.length > 1 ? words.slice(0, -1).join(' ') : apply.contactName.trim(),
                lastName: words.length > 1 ? words[words.length - 1] : '.',
            };
            const res = await fetch(API_ENDPOINTS.b2b.application(), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            const data = await res.json();
            if (data?.success) {
                toast.success(data.message || 'Başvurunuz alındı, en kısa sürede sizinle iletişime geçeceğiz.');
                setApply({
                    contactName: '', email: '', phone: '',
                    cityId: '', city: '', district: '', address: '',
                    companyName: '', taxOffice: '', taxNumber: '',
                    yearsOfExperience: '', monthlySalesVolume: '', brands: [], wantsBrandedSignage: '',
                    message: '', termsAccepted: false
                });
            } else {
                toast.error(data?.message || 'Başvuru gönderilemedi, lütfen tekrar deneyin.');
            }
        } catch {
            toast.error('Başvuru gönderilemedi, lütfen tekrar deneyin.');
        } finally {
            setSubmitting(false);
        }
    };

    const switchTab = (next: TabKey) => {
        setTab(next);
    };

    const tabButtonStyle = (active: boolean): React.CSSProperties => ({
        flex: 1,
        padding: '12px 8px',
        background: 'transparent',
        border: 'none',
        borderBottom: active ? `3px solid ${site.theme.primary}` : '3px solid transparent',
        color: active ? '#ffffff' : '#9a9a9a',
        fontWeight: 700,
        fontSize: 14,
        cursor: 'pointer',
    });

    return (
        <div
            style={{
                position: 'relative',
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '40px 16px',
                background: '#1a1a1a',
                overflow: 'hidden',
            }}
        >
            {/* Arka plan slider katmanları — aktif görsel yumuşak geçişle görünür */}
            {LOGIN_BG_IMAGES.map((image, index) => (
                <div
                    key={image}
                    style={{
                        position: 'absolute',
                        inset: 0,
                        backgroundImage: `url(${image})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        opacity: index === bgIndex ? 1 : 0,
                        transition: 'opacity 1.5s ease-in-out',
                    }}
                />
            ))}
            {/* Karartma katmanı — kartın okunabilirliği için */}
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(0, 0, 0, 0.65)' }} />
            <div
                style={{
                    position: 'relative',
                    zIndex: 1,
                    width: '100%',
                    maxWidth: 640,
                    background: '#1a1a1a',
                    borderRadius: 10,
                    boxShadow: '0 12px 40px rgba(0, 0, 0, 0.5)',
                    overflow: 'hidden',
                }}
            >
                <div style={{ textAlign: 'center', padding: '28px 24px 16px' }}>
                    <img src={site.theme.logo} alt={site.name} style={{ maxWidth: 210, width: '100%' }} />
                    <div style={{ color: site.theme.primary, fontWeight: 700, fontSize: 13, marginTop: 8 }}>
                        Bayi Toptan Satış Platformu
                    </div>
                </div>

                <div style={{ display: 'flex', borderBottom: '1px solid #3d3d3d' }}>
                    <button type='button' style={tabButtonStyle(tab === 'login')} onClick={() => switchTab('login')}>
                        Giriş Yap
                    </button>
                    <button type='button' style={tabButtonStyle(tab === 'apply')} onClick={() => switchTab('apply')}>
                        Yeni Başvuru Formu
                    </button>
                </div>

                <div style={{ padding: '24px' }}>
                    {tab === 'login' ? (
                        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                            <div>
                                <label style={labelStyle} htmlFor='b2b-code'>Bayi Kodu veya E-posta</label>
                                <input id='b2b-code' type='text' required style={inputStyle} value={loginId} onChange={e => setLoginId(e.target.value)} />
                            </div>
                            <div>
                                <label style={labelStyle} htmlFor='b2b-password'>Şifre</label>
                                <input id='b2b-password' type='password' required style={inputStyle} value={loginPassword} onChange={e => setLoginPassword(e.target.value)} />
                            </div>
                            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#c9c9c9', cursor: 'pointer' }}>
                                <input type='checkbox' style={{ accentColor: site.theme.primary }} />
                                Beni Hatırla
                            </label>
                            <button
                                type='submit'
                                style={{
                                    background: site.theme.primary,
                                    color: '#1a1a1a',
                                    border: 'none',
                                    borderRadius: 6,
                                    padding: '12px',
                                    fontWeight: 700,
                                    fontSize: 15,
                                    cursor: 'pointer',
                                }}
                                disabled={loggingIn}
                            >
                                {loggingIn ? 'Giriş Yapılıyor...' : 'Giriş Yap'}
                            </button>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                                <a href='#' onClick={(e) => { e.preventDefault(); toast.info('Şifre sıfırlama hazırlık aşamasındadır.'); }} style={{ color: '#c9c9c9' }}>
                                    Şifremi Unuttum
                                </a>
                                <a href='#' onClick={(e) => { e.preventDefault(); toast.info('Plasiyer girişi hazırlık aşamasındadır.'); }} style={{ color: site.theme.primary, fontWeight: 600 }}>
                                    Plasiyer Girişi
                                </a>
                            </div>
                        </form>
                    ) : (
                        <form onSubmit={handleApply} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                            <div style={{ display: 'flex', gap: 12 }}>
                                <div style={{ flex: 1 }}>
                                    <label style={labelStyle} htmlFor='b2b-contact'>Yetkili Ad Soyad{requiredMark}</label>
                                    <input id='b2b-contact' type='text' required style={inputStyle} value={apply.contactName} onChange={e => setApplyField('contactName', e.target.value)} />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <label style={labelStyle} htmlFor='b2b-phone'>Telefon</label>
                                    <input id='b2b-phone' type='tel' style={inputStyle} value={apply.phone}
                                        onFocus={() => { if (!apply.phone) setApplyField('phone', '+90 '); }}
                                        onChange={e => setApplyField('phone', formatPhone(e.target.value))} />
                                </div>
                            </div>
                            <div>
                                <label style={labelStyle} htmlFor='b2b-apply-email'>E-posta{requiredMark}</label>
                                <input id='b2b-apply-email' type='email' required style={inputStyle} value={apply.email} onChange={e => setApplyField('email', e.target.value)} />
                            </div>
                            <div>
                                <label style={labelStyle} htmlFor='b2b-company'>Firma Ünvanı</label>
                                <input id='b2b-company' type='text' style={inputStyle} value={apply.companyName} onChange={e => setApplyField('companyName', e.target.value)} />
                            </div>
                            <div style={{ display: 'flex', gap: 12 }}>
                                <div style={{ flex: 1 }}>
                                    <label style={labelStyle} htmlFor='b2b-city'>İl</label>
                                    <select id='b2b-city' required style={inputStyle} value={apply.cityId} onChange={e => handleCityChange(e.target.value)}>
                                        <option value=''>Seçiniz</option>
                                        {cities.map(c => (
                                            <option key={c.cityId} value={c.cityId}>{c.cityName}</option>
                                        ))}
                                    </select>
                                </div>
                                <div style={{ flex: 1 }}>
                                    <label style={labelStyle} htmlFor='b2b-district'>İlçe</label>
                                    <select id='b2b-district' required disabled={!apply.cityId} style={{ ...inputStyle, opacity: apply.cityId ? 1 : 0.5 }} value={apply.district} onChange={e => setApplyField('district', e.target.value)}>
                                        <option value=''>Seçiniz</option>
                                        {districts.map(d => (
                                            <option key={d.districtId} value={d.districtName}>{d.districtName}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: 12 }}>
                                <div style={{ flex: 1 }}>
                                    <label style={labelStyle} htmlFor='b2b-taxoffice'>Vergi Dairesi</label>
                                    <input id='b2b-taxoffice' type='text' style={inputStyle} value={apply.taxOffice} onChange={e => setApplyField('taxOffice', e.target.value)} />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <label style={labelStyle} htmlFor='b2b-taxno'>Vergi Numarası</label>
                                    <input id='b2b-taxno' type='text' style={inputStyle} value={apply.taxNumber} onChange={e => setApplyField('taxNumber', e.target.value)} />
                                </div>
                            </div>
                            <div>
                                <label style={labelStyle} htmlFor='b2b-address'>Adres</label>
                                <textarea id='b2b-address' rows={3} style={{ ...inputStyle, resize: 'vertical' }} value={apply.address} onChange={e => setApplyField('address', e.target.value)} />
                            </div>

                            {/* Bayilik bilgilerine gecis */}
                            <div style={{ borderTop: '1px solid #3d3d3d', margin: '4px 0' }} />

                            <div style={{ color: site.theme.primary, fontWeight: 700, fontSize: 12, letterSpacing: 0.5, marginTop: 6 }}>BAYİLİK BİLGİLERİ</div>
                            <div style={{ display: 'flex', gap: 12 }}>
                                <div style={{ flex: 1 }}>
                                    <label style={labelStyle} htmlFor='b2b-experience'>Sektörde Kaç Yıllık Tecrübeniz Bulunmaktadır{requiredMark}</label>
                                    <input id='b2b-experience' type='number' min={0} required style={inputStyle} value={apply.yearsOfExperience} onChange={e => setApplyField('yearsOfExperience', e.target.value)} />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <label style={labelStyle} htmlFor='b2b-volume'>Aylık Ortalama Satış Adeti{requiredMark}</label>
                                    <input id='b2b-volume' type='number' min={0} required style={inputStyle} value={apply.monthlySalesVolume} onChange={e => setApplyField('monthlySalesVolume', e.target.value)} />
                                </div>
                            </div>
                            <div style={{ position: 'relative' }}>
                                <label style={labelStyle} htmlFor='b2b-brands'>Çalıştığınız Markalar</label>
                                {apply.brands.length > 0 && (
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 6 }}>
                                        {apply.brands.map(b => (
                                            <span key={b} style={{ background: '#2b2b2b', border: '1px solid #3d3d3d', color: '#fff', borderRadius: 4, padding: '3px 8px', fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                                                {b}
                                                <span onClick={() => removeBrand(b)} style={{ color: site.theme.primary, cursor: 'pointer', fontWeight: 700 }}>×</span>
                                            </span>
                                        ))}
                                    </div>
                                )}
                                <input id='b2b-brands' type='text' autoComplete='off' style={inputStyle} value={brandQuery}
                                    onChange={e => { setBrandQuery(e.target.value); setBrandOpen(true); }}
                                    onFocus={() => setBrandOpen(true)}
                                    onBlur={() => setTimeout(() => setBrandOpen(false), 150)} />
                                {brandOpen && filteredBrands.length > 0 && (
                                    <div style={{ position: 'absolute', left: 0, right: 0, zIndex: 5, background: '#242424', border: '1px solid #3d3d3d', borderRadius: 6, marginTop: 4, maxHeight: 180, overflowY: 'auto' }}>
                                        {filteredBrands.slice(0, 30).map(b => (
                                            <div key={b} onMouseDown={() => addBrand(b)} style={{ padding: '8px 12px', fontSize: 13, color: '#fff', cursor: 'pointer' }}>
                                                {b}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <div>
                                <span style={labelStyle}>LastikJantAVM Tabelalı Bayisi mi Olmak İstiyorsunuz?{requiredMark}</span>
                                <div style={{ display: 'flex', gap: 20, marginTop: 4 }}>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#fff', cursor: 'pointer' }}>
                                        <input type='radio' name='wantsBrandedSignage' required checked={apply.wantsBrandedSignage === 'evet'} onChange={() => setApplyField('wantsBrandedSignage', 'evet')} style={{ accentColor: site.theme.primary }} /> Evet
                                    </label>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#fff', cursor: 'pointer' }}>
                                        <input type='radio' name='wantsBrandedSignage' required checked={apply.wantsBrandedSignage === 'hayir'} onChange={() => setApplyField('wantsBrandedSignage', 'hayir')} style={{ accentColor: site.theme.primary }} /> Hayır
                                    </label>
                                </div>
                            </div>
                            <div>
                                <label style={labelStyle} htmlFor='b2b-note'>Mesajınız</label>
                                <textarea id='b2b-note' rows={3} style={{ ...inputStyle, resize: 'vertical' }} value={apply.message} onChange={e => setApplyField('message', e.target.value)} />
                            </div>
                            <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 13, color: '#c9c9c9', cursor: 'pointer' }}>
                                <input type='checkbox' required checked={apply.termsAccepted} onChange={e => setApplyField('termsAccepted', e.target.checked)} style={{ accentColor: site.theme.primary, marginTop: 2 }} />
                                Sözleşme koşullarını okudum, kabul ediyorum.
                            </label>
                            <button
                                type='submit'
                                style={{
                                    background: site.theme.primary,
                                    color: '#1a1a1a',
                                    border: 'none',
                                    borderRadius: 6,
                                    padding: '12px',
                                    fontWeight: 700,
                                    fontSize: 15,
                                    cursor: 'pointer',
                                }}
                                disabled={submitting}
                            >
                                {submitting ? 'Gönderiliyor...' : 'Başvuru Gönder'}
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
};

export default B2BLogin;
