// İkinci el bilgi sayfası — /ikinci-el (yalnızca lastikjantavm.com)
// LJA ikinci el ürün satmaz; menüdeki "İkinci El Lastik / Jant" bu sayfaya gelir, sayfa kardeş site
// ikinciellastik.com'u tanıtır ve oraya yönlendirir. Bilgiler ikinciellastik.com'un garanti/iade/kontrol
// sayfalarıyla aynıdır; orada değişirse burası da güncellenmeli.
import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { headers } from 'next/headers';
import type { Metadata } from 'next';
import { canonicalMeta, getSiteOrigin } from '@/src/lib/canonical';
import { JsonLd, breadcrumbJsonLd } from '@/src/lib/structuredData';

const isLja = () => (headers().get('x-site') || 'alastik') === 'lastikjantavm';

const SITE = 'https://ikinciellastik.com';
const LOGO_LIGHT = '/lastikjantavm/ikinciellastik/logo-light.png';

const STATS = [
    { value: '1972', label: 'yılından beri lastikte' },
    { value: '1 yıl', label: 'garantiye kadar' },
    { value: '81 il', label: 'montaj noktası' },
    { value: '14 gün', label: 'cayma hakkı' }
];

const SHOP_LINKS = [
    { href: `${SITE}/ikinci-el-yazlik-4-mevsim-lastikler`, label: 'Yaz & 4 Mevsim', sub: 'İkinci el yazlık ve dört mevsim lastikler', icon: 'ri-sun-line' },
    { href: `${SITE}/ikinci-el-kis-lastikleri`, label: 'Kış Lastikleri', sub: 'Yeni tarihli, yüksek dişli kışlıklar', icon: 'ri-snowflake-line' },
    { href: `${SITE}/ikinci-el-jantlar`, label: 'Jantlar', sub: 'PCD ve çapa göre ikinci el jantlar', icon: 'ri-settings-5-line' }
];

const FEATURES = [
    { icon: 'ri-search-eye-line', title: 'Her lastik tek tek kontrol edilir', text: 'Diş derinliği tüm kanallarda ölçülür, DOT (üretim tarihi) okunur; yanak ve taban kesik, balon ve tamir izine karşı incelenir, balans ve iç yapı kontrol edilir. Kontrolden geçemeyen lastik satışa çıkmaz.' },
    { icon: 'ri-camera-lens-line', title: 'Gördüğünüz lastik, gelen lastiktir', text: 'Fotoğraflar temsili değil, satılan lastiğin kendisine aittir. Üretim yılı, mm cinsinden diş derinliği ve varsa tamir/yama durumu ürün sayfasında açıkça yazılır.' },
    { icon: 'ri-shield-check-line', title: 'Diş derinliğine göre garanti', text: '7 mm ve üzeri lastiklerde 1 yıl, altındakilerde 6 ay garanti. Balon yapma ve kat ayrılması gibi üretim kaynaklı sorunlar garanti kapsamındadır.' },
    { icon: 'ri-map-pin-2-line', title: 'Adrese ya da montaj noktasına', text: 'Lastikler adresinize veya seçtiğiniz anlaşmalı montaj noktasına gönderilir. İstanbul’da Şişli Mecidiyeköy ve Maslak şubelerimizde montaj yapılır.' }
];

const STEPS = [
    { title: 'Ebadınızı seçin', text: 'Lastiğinizin yanağındaki ebadı (ör. 205/55R16) girin ya da aracınızı seçin.' },
    { title: 'Lastiği inceleyin', text: 'DOT yılına, diş derinliğine ve gerçek fotoğraflara bakın.' },
    { title: 'Siparişi verin', text: 'Teslimat adresini ya da size yakın montaj noktasını seçin.' },
    { title: 'Taktırın', text: 'Lastikleriniz kargolanır; montajı seçtiğiniz noktada yapılır.' }
];

const FAQS = [
    { q: 'ikinciellastik.com ile LastikJantAVM aynı firma mı?', a: 'Evet. İki site de 1972’den bu yana lastik ve jant işi yapan ART Lastik’e aittir. Sıfır lastik ve jantları LastikJantAVM’de, ikinci el lastik ve jantları ikinciellastik.com’da satıyoruz.' },
    { q: 'Neden ikinci el ürünler ayrı bir sitede?', a: 'İkinci el lastiklerin her biri tektir: üretim yılı, diş derinliği ve kondisyonu farklıdır. Bu bilgileri ve gerçek fotoğrafları düzgün gösterebilmek için ikinci el ürünleri kendi sitesinde listeliyoruz.' },
    { q: 'İkinci el lastikler garantili mi?', a: 'Evet. Diş derinliği 7 mm ve üzeri olan lastiklerde 1 yıl, altındakilerde 6 ay garanti verilir. Darbe, yol hasarı ve normal aşınma garanti dışıdır. Garanti yalnızca ikinciellastik.com’dan alınan ürünlerde geçerlidir.' },
    { q: 'İkinci el lastikler kaplama veya diş açma mı?', a: 'Hayır. Satılan lastikler kontrol edilmiş ikinci el lastiklerdir; kontrolden geçemeyen lastikler satışa sunulmaz.' },
    { q: 'Beğenmezsem iade edebilir miyim?', a: 'Araca takılmamış ve kullanılmamış ürünlerde teslimden itibaren 14 gün içinde cayma hakkınız vardır. Ürün sayfadaki beyana aykırıysa iade masrafları satıcıya aittir.' },
    { q: 'Sıfır mı, ikinci el mi almalıyım?', a: 'Aracınızı uzun süre kullanacaksanız ya da yüksek kilometre yapıyorsanız sıfır lastik daha uzun ömürlüdür. Kısa süreli kullanım, aracı satmaya hazırlık ya da bütçe öncelikliyse yüksek diş derinlikli, yeni tarihli ikinci el lastik mantıklı bir seçenektir.' }
];

const CSS = `
/* ikinciellastik.com logo renkleri: lacivert + mavi */
.ie { --ie-dark: #0a3462; --ie-accent: #3b92ed; --ie-soft: #eaf3fd; }
.ie-hero { position: relative; overflow: hidden; border-radius: 20px; color: #fff; padding: 48px 40px;
  background: radial-gradient(120% 140% at 100% 0%, #1b5596 0%, var(--ie-dark) 55%); }
.ie-hero::before { content: ''; position: absolute; right: -120px; top: 50%; width: 420px; height: 420px; transform: translateY(-50%);
  border-radius: 50%; border: 46px solid rgba(255,255,255,.06);
  background: repeating-conic-gradient(from 0deg, rgba(255,255,255,.05) 0 6deg, transparent 6deg 12deg); }
.ie-hero::after { content: ''; position: absolute; right: 40px; top: 50%; width: 140px; height: 140px; transform: translateY(-50%);
  border-radius: 50%; border: 10px solid rgba(59,146,237,.45); }
.ie-hero > * { position: relative; z-index: 1; }
.ie-logo { display: block; height: 34px; width: auto; max-width: 100%; margin-bottom: 22px; }
.ie-badge { display: inline-block; background: rgba(255,255,255,.14); color: #fff; font-weight: 800; font-size: .78rem;
  letter-spacing: .6px; padding: 6px 14px; border-radius: 999px; margin-bottom: 18px; }
.ie-hero h1 { color: #fff; font-size: clamp(1.6rem, 3.4vw, 2.4rem); font-weight: 800; line-height: 1.2; max-width: 620px; margin-bottom: 14px; }
.ie-hero p { color: #fff; max-width: 580px; opacity: .88; font-size: 1.05rem; margin-bottom: 26px; }
.ie-btn { display: inline-flex; align-items: center; gap: 8px; font-weight: 700; padding: 13px 24px; border-radius: 12px;
  text-decoration: none; transition: transform .2s ease, box-shadow .2s ease, background .2s ease; }
.ie-btn-primary { background: var(--ie-accent); color: #fff; }
.ie-btn-primary:hover { color: #fff; transform: translateY(-2px); box-shadow: 0 10px 24px rgba(59,146,237,.4); }
.ie-btn-ghost { border: 1.5px solid rgba(255,255,255,.4); color: #fff; }
.ie-btn-ghost:hover { color: #fff; background: rgba(255,255,255,.08); }
.ie-btn i { transition: transform .2s ease; }
.ie-btn:hover i { transform: translateX(4px); }
.ie-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin: -26px 24px 40px; position: relative; z-index: 2; }
.ie-stat { background: #fff; border-radius: 14px; padding: 16px; text-align: center; box-shadow: 0 8px 24px rgba(0,0,0,.08); }
.ie-stat b { display: block; font-size: 1.35rem; font-weight: 800; color: var(--ie-dark); }
.ie-stat small { color: #6c757d; }
.ie-h2 { font-size: 1.45rem; font-weight: 800; margin-bottom: 6px; }
.ie-lead { color: #6c757d; margin-bottom: 20px; }
.ie-section { margin-bottom: 44px; }
.ie-shop { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; }
.ie-shop a { display: flex; flex-direction: column; gap: 6px; padding: 22px; border-radius: 16px; border: 1px solid #ececec;
  color: var(--ie-dark); text-decoration: none; background: #fff; transition: border-color .2s ease, transform .2s ease, box-shadow .2s ease; }
.ie-shop a:hover { border-color: var(--ie-accent); transform: translateY(-3px); box-shadow: 0 10px 24px rgba(0,0,0,.07); }
.ie-shop i.ie-icon { width: 46px; height: 46px; display: grid; place-items: center; border-radius: 12px; font-size: 1.4rem;
  background: var(--ie-soft); color: var(--ie-dark); margin-bottom: 6px; }
.ie-shop b { font-size: 1.05rem; }
.ie-shop span { font-size: .88rem; color: #6c757d; }
.ie-shop em { font-style: normal; font-weight: 700; font-size: .85rem; margin-top: 6px; }
.ie-features { display: grid; grid-template-columns: repeat(2, 1fr); gap: 14px; }
.ie-feature { display: flex; gap: 16px; padding: 20px; border-radius: 16px; background: #f5f8fc; }
.ie-feature i { flex: 0 0 auto; width: 44px; height: 44px; display: grid; place-items: center; border-radius: 50%;
  background: var(--ie-dark); color: #fff; font-size: 1.25rem; }
.ie-feature h3 { font-size: 1rem; font-weight: 700; margin-bottom: 4px; }
.ie-feature p { font-size: .92rem; color: #555; margin: 0; }
.ie-steps { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; counter-reset: ie-step; }
.ie-step { position: relative; padding: 22px 18px 18px; border-radius: 16px; border: 1px dashed #d6d6d6; }
.ie-step::before { counter-increment: ie-step; content: counter(ie-step); position: absolute; top: -14px; left: 18px;
  width: 30px; height: 30px; border-radius: 50%; background: var(--ie-accent); color: #fff; font-weight: 800;
  display: grid; place-items: center; font-size: .9rem; }
.ie-step b { display: block; margin-bottom: 4px; }
.ie-step p { font-size: .9rem; color: #555; margin: 0; }
.ie-new { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; padding: 18px 20px; border-radius: 16px; background: #f5f8fc; }
.ie-new a { padding: 7px 14px; border-radius: 999px; background: #fff; border: 1px solid #e3e3e3; color: var(--ie-dark);
  text-decoration: none; font-size: .9rem; font-weight: 600; }
.ie-new a:hover { border-color: var(--ie-dark); }
.ie-faq details { border: 1px solid #ececec; border-radius: 14px; margin-bottom: 10px; background: #fff; }
.ie-faq summary { cursor: pointer; list-style: none; padding: 16px 20px; font-weight: 700; display: flex; justify-content: space-between; gap: 12px; }
.ie-faq summary::-webkit-details-marker { display: none; }
.ie-faq summary::after { content: '+'; font-size: 1.3rem; line-height: 1; color: #999; }
.ie-faq details[open] summary::after { content: '–'; }
.ie-faq details p { padding: 0 20px 16px; margin: 0; color: #555; }
.ie-cta { border-radius: 20px; padding: 32px; display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between;
  gap: 18px; background: var(--ie-dark); color: #fff; }
.ie-cta img { display: block; height: 26px; width: auto; max-width: 100%; margin-bottom: 8px; }
.ie-cta b { color: #fff; font-size: 1.1rem; display: block; }
.ie-cta small { color: #fff; }
.ie-cta small { opacity: .75; }
@media (max-width: 991px) {
  .ie-steps { grid-template-columns: repeat(2, 1fr); row-gap: 26px; }
  .ie-stats { grid-template-columns: repeat(2, 1fr); margin: -22px 12px 36px; }
}
@media (max-width: 767px) {
  .ie-hero { padding: 32px 22px 48px; }
  .ie-hero::before { right: -220px; opacity: .6; }
  .ie-hero::after { display: none; }
  .ie-shop, .ie-features { grid-template-columns: 1fr; }
  .ie-btn { width: 100%; justify-content: center; }
  .ie-cta { padding: 24px; }
  .ie-logo { height: 26px; }
}
`;

export async function generateMetadata(): Promise<Metadata> {
    if (!isLja()) return {};
    return {
        title: 'İkinci El Lastik ve Jant: ikinciellastik.com | LastikJantAVM',
        description: 'LastikJantAVM’nin ikinci el lastik ve jantları ikinciellastik.com’da: tek tek kontrol edilmiş, DOT yılı ve diş derinliği belli, gerçek fotoğraflı, 6 ay – 1 yıl garantili lastikler.',
        ...(await canonicalMeta('/ikinci-el'))
    };
}

export default async function SecondHandInfoPage() {
    if (!isLja()) notFound();
    const origin = await getSiteOrigin();

    return (
        <section className="ie py-4">
            <style>{CSS}</style>
            <JsonLd data={breadcrumbJsonLd(origin, [{ name: 'İkinci El Lastik ve Jant' }])} />
            <JsonLd data={{
                '@context': 'https://schema.org',
                '@type': 'FAQPage',
                mainEntity: FAQS.map(f => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } }))
            }} />
            <div className="container" style={{ maxWidth: 1080 }}>
                <nav aria-label="breadcrumb">
                    <ol className="breadcrumb">
                        <li className="breadcrumb-item"><Link href="/">Ana Sayfa</Link></li>
                        <li className="breadcrumb-item active" aria-current="page">İkinci El Lastik ve Jant</li>
                    </ol>
                </nav>

                <div className="ie-hero">
                    <img src={LOGO_LIGHT} alt="ikinciellastik.com" width={669} height={74} className="ie-logo" />
                    <span className="ie-badge">GARANTİLİ 2.EL</span>
                    <h1>İkinci el lastik ve jantlarımız artık ikinciellastik.com’da</h1>
                    <p>
                        LastikJantAVM’de sıfır lastik ve jant satıyoruz. İkinci el ürünlerimizi ise aynı çatı altındaki
                        ikinciellastik.com’da; kontrol edilmiş, üretim yılı ve diş derinliği yazılı, gerçek fotoğraflarıyla sunuyoruz.
                    </p>
                    <div className="d-flex flex-wrap gap-2">
                        <a href={`${SITE}/ikinci-el-lastikler`} className="ie-btn ie-btn-primary">
                            İkinci El Lastiklere Git <i className="ri-arrow-right-line" />
                        </a>
                        <a href={`${SITE}/ikinci-el-jantlar`} className="ie-btn ie-btn-ghost">İkinci El Jantlar</a>
                    </div>
                </div>

                <div className="ie-stats">
                    {STATS.map(s => (
                        <div className="ie-stat" key={s.label}><b>{s.value}</b><small>{s.label}</small></div>
                    ))}
                </div>

                <div className="ie-section">
                    <h2 className="ie-h2">ikinciellastik.com’da Neler Var?</h2>
                    <p className="ie-lead">Aradığınız ürüne doğrudan gidin.</p>
                    <div className="ie-shop">
                        {SHOP_LINKS.map(l => (
                            <a href={l.href} key={l.href}>
                                <i className={`${l.icon} ie-icon`} />
                                <b>{l.label}</b>
                                <span>{l.sub}</span>
                                <em>İncele <i className="ri-arrow-right-line" /></em>
                            </a>
                        ))}
                    </div>
                </div>

                <div className="ie-section">
                    <h2 className="ie-h2">Neden ikinciellastik.com?</h2>
                    <p className="ie-lead">İkinci el lastikte önemli olan, ne aldığınızı bilmek.</p>
                    <div className="ie-features">
                        {FEATURES.map(f => (
                            <div className="ie-feature" key={f.title}>
                                <i className={f.icon} />
                                <div>
                                    <h3>{f.title}</h3>
                                    <p>{f.text}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="ie-section">
                    <h2 className="ie-h2">4 Adımda Alışveriş</h2>
                    <p className="ie-lead">Sipariş vermek birkaç dakikanızı alır.</p>
                    <div className="ie-steps">
                        {STEPS.map(s => (
                            <div className="ie-step" key={s.title}><b>{s.title}</b><p>{s.text}</p></div>
                        ))}
                    </div>
                </div>

                <div className="ie-section">
                    <h2 className="ie-h2">Sıfır Lastik mi Arıyorsunuz?</h2>
                    <p className="ie-lead">Sıfır lastik, jant ve kar ürünleri LastikJantAVM’de.</p>
                    <div className="ie-new">
                        <Link href="/kategori/lastik">Sıfır Lastikler</Link>
                        <Link href="/kategori/jant">Jantlar</Link>
                        <Link href="/arac">Araca Göre Lastik</Link>
                        <Link href="/kategori/kar-zinciri">Kar Zinciri</Link>
                        <Link href="/subeler">Şubelerimiz</Link>
                    </div>
                </div>

                <div className="ie-section ie-faq">
                    <h2 className="ie-h2 mb-3">Sık Sorulan Sorular</h2>
                    {FAQS.map(f => (
                        <details key={f.q}>
                            <summary>{f.q}</summary>
                            <p>{f.a}</p>
                        </details>
                    ))}
                </div>

                <div className="ie-cta">
                    <div>
                        <img src={LOGO_LIGHT} alt="ikinciellastik.com" width={669} height={74} loading="lazy" />
                        <b>Ekspertizli, garantili ikinci el lastikler</b>
                        <small>Tüm ürünler DOT yılı, diş derinliği ve gerçek fotoğraflarıyla.</small>
                    </div>
                    <a href={SITE} className="ie-btn ie-btn-primary">ikinciellastik.com’a Git <i className="ri-arrow-right-line" /></a>
                </div>
            </div>
        </section>
    );
}
