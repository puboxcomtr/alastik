// LJA ana sayfası — sunucu tarafında basılan H1 + kısa tanıtım metni (server component, yalnızca lastikjantavm.com).
// Ana sayfanın geri kalanı istemci tarafında çizildiği için arama motorlarının gördüğü HTML'de başlık ve
// açıklayıcı metin yoktu. Burada: tek H1, iki kısa paragraf açık; devamı ve bağlantı çipleri "Devamını oku"
// altında kapalı durur — ziyaretçi kalabalık görmez, metnin tamamı sunucu HTML'inde bulunur.
// Bağlantılar sabittir ve yalnızca yayında olduğu doğrulanmış adreslere gider (kategori, etiket, marka, araç).
import React from 'react';
import Link from 'next/link';

const CSS = `
.lja-hi { margin: 8px 0 4px; color: #333; }
.lja-hi h1 { font-size: 1.25rem; font-weight: 700; color: #111; margin: 0 0 8px; }
.lja-hi h2 { font-size: 1rem; font-weight: 700; color: #111; margin: 14px 0 6px; }
.lja-hi p { line-height: 1.65; margin-bottom: 8px; font-size: .95rem; }
.lja-hi a { color: #111; font-weight: 600; text-decoration: underline; text-underline-offset: 2px; }
.lja-hi details > summary { cursor: pointer; list-style: none; font-weight: 600; color: #111; text-decoration: underline; text-underline-offset: 3px; font-size: .9rem; padding: 2px 0 6px; }
.lja-hi details > summary::-webkit-details-marker { display: none; }
.lja-hi details[open] > summary { display: none; }
.lja-hi-chips { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 10px; }
.lja-hi-chips a { font-size: .82rem; font-weight: 600; text-decoration: none; padding: 4px 10px; border-radius: 999px; border: 1px solid #ddd; background: #fff; color: #111; }
.lja-hi-chips a:hover { border-color: #111; }
`;

const SEASONS = [
    { href: '/kategori/yaz-lastikleri', label: 'Yaz lastiği' },
    { href: '/kategori/kis-lastikleri', label: 'Kış lastiği' },
    { href: '/kategori/4-mevsim-lastikler', label: '4 mevsim lastiği' },
    { href: '/kategori/jant', label: 'Jant' },
    { href: '/kategori/kar-zinciri', label: 'Kar zinciri' },
    { href: '/kategori/kar-paleti', label: 'Kar paleti' },
    { href: '/kategori/kar-corabi', label: 'Kar çorabı' }
];
const SIZES = ['175/65 R14', '185/65 R15', '195/65 R15', '205/55 R16', '215/65 R16', '225/45 R17', '225/50 R17', '235/55 R18'];
const sizeHref = (s: string) => `/etiket/${s.replace(/[\/ ]/g, '-').toLowerCase()}-lastik-fiyatlari`;
const BRANDS = [
    ['michelin', 'Michelin'], ['bridgestone', 'Bridgestone'], ['goodyear', 'Goodyear'], ['continental', 'Continental'], ['pirelli', 'Pirelli'],
    ['hankook', 'Hankook'], ['lassa', 'Lassa'], ['petlas', 'Petlas'], ['falken', 'Falken'], ['kumho', 'Kumho'], ['dunlop', 'Dunlop']
];
const MAKES = [
    ['fiat', 'Fiat'], ['renault', 'Renault'], ['volkswagen', 'Volkswagen'], ['toyota', 'Toyota'], ['hyundai', 'Hyundai'], ['ford', 'Ford'],
    ['opel', 'Opel'], ['peugeot', 'Peugeot'], ['dacia', 'Dacia'], ['bmw', 'BMW'], ['mercedes', 'Mercedes-Benz'], ['audi', 'Audi']
];

function Chips({ items }: { items: { href: string; label: string }[] }) {
    return <div className="lja-hi-chips">{items.map(i => <Link key={i.href} href={i.href}>{i.label}</Link>)}</div>;
}

export default function HomeIntro() {
    return (
        <section className="container lja-hi" aria-label="LastikJantAVM hakkında">
            <style>{CSS}</style>
            <h1>Lastik, Jant ve Kar Zinciri Fiyatları – Uygun Fiyat, Ücretsiz Kargo, Montaj Seçeneği</h1>
            <p>
                LastikJantAVM, binek, SUV, 4x4, ticari ve elektrikli araçlar için <Link href="/kategori/lastik">lastik</Link>,{' '}
                <Link href="/kategori/jant">jant</Link>, <Link href="/kategori/kar-zinciri">kar zinciri</Link>, kar paleti ve kar çorabını tek adresten sunar.
                Lastiği ebata, mevsime, markaya ya da aracınızın marka ve modeline göre seçebilir; ürünleri Türkiye’nin her yerine ücretsiz kargoyla
                sipariş edebilir ya da anlaşmalı montaj noktalarından birinde montajla birlikte satın alabilirsiniz.
            </p>
            <p>
                İstanbul’daki <Link href="/subeler/sisli-mecidiyekoy">Şişli Mecidiyeköy</Link> ve <Link href="/subeler/maslak">Maslak</Link> şubelerimizde
                lastik montajı, balans, rot ayarı, mantar yama ve jant düzeltme gibi hizmetleri aynı gün alabilirsiniz; şube sayfalarında güncel hizmet
                fiyatları ve çalışma saatleri yer alır.
            </p>
            <details>
                <summary>Devamını oku</summary>
                <h2>Mevsime ve ürüne göre</h2>
                <p>
                    Yaz, kış ve 4 mevsim lastikleri ile jant, kar zinciri, kar paleti ve kar çorabı kategorilerinde Michelin, Bridgestone, Goodyear,
                    Continental, Pirelli, Hankook, Lassa ve Petlas başta olmak üzere onlarca markanın güncel stoğu listelenir. Kış lastiği zorunluluğu
                    olan illerde 3PMSF işaretli kış lastiği ya da kış onaylı 4 mevsim lastik, kar yağışı yoğun bölgelerde ise kar zinciri veya kar
                    paleti ile birlikte almak güvenli bir çözümdür.
                </p>
                <Chips items={SEASONS} />
                <h2>Ebata göre lastik fiyatları</h2>
                <p>
                    Lastik ebatınızı kapı sütunundaki etiketten ya da mevcut lastiğin yanağından okuyabilirsiniz; en çok aranan ebatların fiyat
                    sayfalarına aşağıdan ulaşabilirsiniz.
                </p>
                <Chips items={SIZES.map(s => ({ href: sizeHref(s), label: s }))} />
                <h2>Markaya göre</h2>
                <Chips items={BRANDS.map(([s, n]) => ({ href: `/marka/${s}`, label: n }))} />
                <h2>Aracınıza göre</h2>
                <p>
                    <Link href="/arac">Araca göre lastik</Link> bölümünde markanızı ve modelinizi seçtiğinizde fabrika çıkışı lastik ebatları, jant çapı
                    ve bijon ölçüleriyle birlikte stoktaki uyumlu lastik, jant ve kar zinciri seçenekleri listelenir.
                </p>
                <Chips items={MAKES.map(([s, n]) => ({ href: `/arac/${s}`, label: n }))} />
                <h2>Montaj ve yerel hizmet</h2>
                <p>
                    Sepette montaj seçeneğini işaretleyip Türkiye’nin 81 ilindeki anlaşmalı <Link href="/montaj-noktalari">montaj noktalarından</Link> birini
                    seçebilirsiniz; lastikler doğrudan seçtiğiniz noktaya gönderilir. <Link href="/lastikci">İl ve ilçe lastikçi</Link> sayfalarında size
                    en yakın noktaları ve o bölgede en çok tercih edilen ebatları görebilirsiniz.
                </p>
            </details>
        </section>
    );
}
