'use client';
// B2B giriş ekranı — b2b.lastikjantavm.com/b2b düzeni referans alınmıştır.
// İki sekme: Giriş Yap / Yeni Başvuru Formu. Arka plan SLIDER'dır (8 Eyl kararı):
// public/b2b/ altındaki görseller sırayla yumuşak geçişle döner; görselleri
// değiştirmek için dosyaları güncelleyin / listeye ekleyin.
import { useEffect, useState } from 'react';
import { SITES } from '@src/config/siteConfig';
import { API_ENDPOINTS, getImageUrl } from '@src/config/api';
import { toast } from 'react-toastify';
import { B2BLoginGlobe } from '@components/b2b-theme/b2b-login-globe';
import { LoginPopup } from '@components/b2b-theme/login-popup';

type TabKey = 'login' | 'apply';

const site = SITES.b2b;

const inputStyle: React.CSSProperties = {
    width: '100%',
    background: '#f4f5f7',
    border: '1px solid #e1e5e9',
    borderRadius: 8,
    padding: '12px 14px',
    color: '#1a1a1a',
    fontSize: 14,
    outline: 'none',
};

const requiredMark = <span style={{ color: '#e05252' }}> *</span>;

const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: 12,
    color: '#555',
    fontWeight: 600,
    marginBottom: 6,
};

const B2BLogin = () => {
    const [tab, setTab] = useState<TabKey>('login');
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


    // Giriş: cari kodu VEYA e-posta + şifre
    const [loginId, setLoginId] = useState('');
    const [loginPassword, setLoginPassword] = useState('');

    // Giriş modu: bayi (varsayılan) veya plasiyer (kullanıcı adı + şifre)
    const [loginMode, setLoginMode] = useState<'bayi' | 'plasiyer'>('bayi');
    const [spKod, setSpKod] = useState('');
    const [spPassword, setSpPassword] = useState('');
    const [spLoggingIn, setSpLoggingIn] = useState(false);

    // Logo: panelden yüklenen b2b logosu (ayarlar); yoksa statik config logosu
    const [logo, setLogo] = useState<string>(site.theme.logo);
    // Giriş ekranı duyuru popup'ı: panelde (Tema Ayarları) açıksa ve görsel yüklüyse
    const [loginPopupImage, setLoginPopupImage] = useState('');
    useEffect(() => {
        fetch(API_ENDPOINTS.b2b.themeSettings())
            .then(r => r.json())
            .then(d => {
                if (!d?.success) return;
                if (d.data?.logo) setLogo(getImageUrl(d.data.logo));
                if (d.data?.loginPopupEnabled === true && d.data?.loginPopupImage) setLoginPopupImage(getImageUrl(d.data.loginPopupImage));
            })
            .catch(() => { });
    }, []);

    // Sayfa ?giris=plasiyer ile açılırsa doğrudan plasiyer modunda gelsin
    useEffect(() => {
        if (typeof window === 'undefined') return;
        if (new URLSearchParams(window.location.search).get('giris') === 'plasiyer') {
            setLoginMode('plasiyer');
        }
    }, []);

    // Mod değişince sayfa TAM yenilensin (URL değişir, form in-place değişmez → kafa karışmaz)
    const goToLoginMode = (mode: 'bayi' | 'plasiyer') => {
        window.location.href = mode === 'plasiyer' ? '/giris?giris=plasiyer' : '/giris';
    };

    const handlePlasiyerLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setSpLoggingIn(true);
        try {
            const res = await fetch(API_ENDPOINTS.b2b.plasiyerLogin(), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ kullaniciKodu: spKod, password: spPassword }),
            });
            const data = await res.json();
            if (data?.success && data.data?.token) {
                localStorage.setItem('plasiyerToken', data.data.token);
                toast.success('Giriş başarılı, bayi seçimine yönlendiriliyorsunuz...');
                setTimeout(() => { window.location.href = '/'; }, 600);
            } else {
                toast.error(data?.message || 'Giriş yapılamadı.');
            }
        } catch {
            toast.error('Giriş yapılamadı, lütfen tekrar deneyin.');
        } finally {
            setSpLoggingIn(false);
        }
    };
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


    return (
        <div className="b2b-giris-root" style={{ minHeight: '100vh', display: 'flex', background: '#ffffff' }}>
            {loginPopupImage ? <LoginPopup image={loginPopupImage} /> : null}
            {/* SOL PANEL — tanıtım */}
            <div className="b2b-giris-sol" style={{
                flex: '0 0 56%', position: 'relative', overflow: 'hidden', color: '#fff',
                background: 'radial-gradient(45% 40% at 48% 70%, rgba(224,205,0,0.10) 0%, transparent 70%), linear-gradient(90deg, #0d1014 0%, #161a20 50%, #1f232a 82%, #8d9198 93%, #ffffff 100%)',
                padding: '72px 48px', display: 'flex', flexDirection: 'column', justifyContent: 'flex-start',
            }}>
                {/* WebGL "dünya" + lastik (artlastik hero sahnesi) — dekoratif arka plan */}
                <B2BLoginGlobe />
                {/* Dünya çevresindeki yörünge etiketleri (artlastik hero) — giriş + yüzme animasyonu, hover vurgusu */}
                <div className="b2b-orbit-katman">
                    {[
                        ['1972’den beri', '40%', '14%'],
                        ['Gelişmiş B2B Platformu', '37%', '50%'],
                        ['50+ Yıl Deneyim', '45%', '66%'],
                        ['E-Ticaret', '63%', '76%'],
                        ['Filo Çözümleri', '73%', '8%'],
                        ['Dünya Lastik Markaları', '79%', '66%'],
                        ['Güçlü Tedarik Ağı', '84%', '38%'],
                    ].map(([text, top, left], i) => (
                        <span key={text} className="b2b-orbit-label" style={{ top, left, animationDelay: `${(1.18 + i * 0.09).toFixed(2)}s, ${(i * 0.8).toFixed(1)}s` }}>
                            <span className="b2b-orbit-dot" />{text}
                        </span>
                    ))}
                </div>
                <div style={{ position: 'relative', zIndex: 1, textAlign: 'center' }}>
                <h1 style={{ margin: 0, fontSize: 40, fontWeight: 800, lineHeight: 1.1 }}>
                    Art Lastik<br /><span style={{ color: site.theme.primary }}>B2B Satış Platformu</span>
                </h1>
                </div>
                <div style={{ position: 'absolute', left: 48, bottom: 28, fontSize: 12, color: 'rgba(255,255,255,0.5)', zIndex: 1 }}>
                    LastikJantAVM, Art Lastik markasıdır. Tüm hakları saklıdır.
                </div>
            </div>

            {/* SAĞ PANEL — giriş/başvuru kartı */}
            <div className="b2b-giris-sag" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 24px', overflowY: 'auto' }}>
                <div style={{ width: '100%', maxWidth: tab === 'apply' ? 620 : 420, textAlign: 'center', marginBottom: 20 }}>
                    <img src={logo} alt={site.name} style={{ maxWidth: 190, width: '100%', marginBottom: 18 }} />
                    <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#1a1a1a' }}>
                        {tab === 'login' ? 'Hesabınıza giriş yapın' : 'Bayimiz Olun'}
                    </h2>
                    <p style={{ margin: '6px 0 0', fontSize: 14, color: '#777' }}>
                        {tab === 'login' ? 'Bayi panelinize erişmek için bilgilerinizi girin' : 'Başvuru formunu doldurun, sizinle iletişime geçelim'}
                    </p>
                </div>

                <div style={{ width: '100%', maxWidth: tab === 'apply' ? 620 : 420 }}>
                    {tab === 'login' ? (
                        loginMode === 'bayi' ? (
                        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                            <div>
                                <label style={labelStyle} htmlFor='b2b-code'>Bayi Kodu, E-posta veya Cep Telefonu</label>
                                <input id='b2b-code' type='text' required placeholder='Bayi Kodu, E-posta veya Cep Telefonu giriniz' style={inputStyle} value={loginId} onChange={e => setLoginId(e.target.value)} />
                            </div>
                            <div>
                                <label style={labelStyle} htmlFor='b2b-password'>Şifre</label>
                                <input id='b2b-password' type='password' placeholder='Şifre belirlemediyseniz boş bırakabilirsiniz' style={inputStyle} value={loginPassword} onChange={e => setLoginPassword(e.target.value)} />
                            </div>
                            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#666', cursor: 'pointer' }}>
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
                                <a href='#' onClick={(e) => { e.preventDefault(); toast.info('Şifre sıfırlama hazırlık aşamasındadır.'); }} style={{ color: '#666' }}>
                                    Şifremi Unuttum
                                </a>
                                <a href='/giris?giris=plasiyer' onClick={(e) => { e.preventDefault(); goToLoginMode('plasiyer'); }} style={{ color: '#16305c', fontWeight: 600 }}>
                                    Plasiyer Girişi
                                </a>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12, color: '#bbb', fontSize: 12, margin: '2px 0' }}>
                                <span style={{ flex: 1, height: 1, background: '#eee' }} /> veya <span style={{ flex: 1, height: 1, background: '#eee' }} />
                            </div>
                            <div style={{ textAlign: 'center', fontSize: 13, color: '#777' }}>
                                Henüz hesabınız yok mu?{' '}
                                <a href='#' onClick={(e) => { e.preventDefault(); switchTab('apply'); }} style={{ color: '#16305c', fontWeight: 700 }}>Bayimiz Olun →</a>
                            </div>
                        </form>
                        ) : (
                        <form onSubmit={handlePlasiyerLogin} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                            <div>
                                <label style={labelStyle} htmlFor='sp-kod'>Kullanıcı Adı</label>
                                <input id='sp-kod' type='text' required placeholder='Lütfen Kullanıcı Adınızı Giriniz' style={inputStyle} value={spKod} onChange={e => setSpKod(e.target.value)} />
                            </div>
                            <div>
                                <label style={labelStyle} htmlFor='sp-password'>Şifre</label>
                                <input id='sp-password' type='password' required placeholder='Lütfen Şifrenizi Yazınız' style={inputStyle} value={spPassword} onChange={e => setSpPassword(e.target.value)} />
                            </div>
                            <button
                                type='submit'
                                style={{ background: site.theme.primary, color: '#1a1a1a', border: 'none', borderRadius: 6, padding: '12px', fontWeight: 700, fontSize: 15, cursor: 'pointer' }}
                                disabled={spLoggingIn}
                            >
                                {spLoggingIn ? 'Giriş Yapılıyor...' : 'Plasiyer Girişi'}
                            </button>
                            <a href='/giris' onClick={(e) => { e.preventDefault(); goToLoginMode('bayi'); }} style={{ color: '#666', fontSize: 13, textAlign: 'center' }}>
                                ← Bayi Girişine Dön
                            </a>
                        </form>
                        )
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
                            <div style={{ borderTop: '1px solid #eee', margin: '4px 0' }} />

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
                                            <span key={b} style={{ background: '#eef1f4', border: '1px solid #e1e5e9', color: '#333', borderRadius: 4, padding: '3px 8px', fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
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
                                    <div style={{ position: 'absolute', left: 0, right: 0, zIndex: 5, background: '#ffffff', border: '1px solid #e1e5e9', borderRadius: 6, marginTop: 4, maxHeight: 180, overflowY: 'auto' }}>
                                        {filteredBrands.slice(0, 30).map(b => (
                                            <div key={b} onMouseDown={() => addBrand(b)} style={{ padding: '8px 12px', fontSize: 13, color: '#333', cursor: 'pointer' }}>
                                                {b}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <div>
                                <span style={labelStyle}>LastikJantAVM Tabelalı Bayisi mi Olmak İstiyorsunuz?{requiredMark}</span>
                                <div style={{ display: 'flex', gap: 20, marginTop: 4 }}>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#333', cursor: 'pointer' }}>
                                        <input type='radio' name='wantsBrandedSignage' required checked={apply.wantsBrandedSignage === 'evet'} onChange={() => setApplyField('wantsBrandedSignage', 'evet')} style={{ accentColor: site.theme.primary }} /> Evet
                                    </label>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#333', cursor: 'pointer' }}>
                                        <input type='radio' name='wantsBrandedSignage' required checked={apply.wantsBrandedSignage === 'hayir'} onChange={() => setApplyField('wantsBrandedSignage', 'hayir')} style={{ accentColor: site.theme.primary }} /> Hayır
                                    </label>
                                </div>
                            </div>
                            <div>
                                <label style={labelStyle} htmlFor='b2b-note'>Mesajınız</label>
                                <textarea id='b2b-note' rows={3} style={{ ...inputStyle, resize: 'vertical' }} value={apply.message} onChange={e => setApplyField('message', e.target.value)} />
                            </div>
                            <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 13, color: '#666', cursor: 'pointer' }}>
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
                            <div style={{ textAlign: 'center', fontSize: 13, color: '#777' }}>
                                Zaten hesabınız var mı?{' '}
                                <a href='#' onClick={(e) => { e.preventDefault(); switchTab('login'); }} style={{ color: '#16305c', fontWeight: 700 }}>Giriş Yap</a>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
};

export default B2BLogin;
