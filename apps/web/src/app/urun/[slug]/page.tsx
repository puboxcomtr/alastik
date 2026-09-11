/* Library */
import React from 'react';
import { Container } from 'react-bootstrap';
import { Grid } from "@mui/material";
import { notFound } from 'next/navigation';
import { headers } from 'next/headers';
import type { Metadata } from 'next';


/* Components - ALastik */
import AlastikProductBreadcrumb from "@components/alastik/product/top/Breadcrumb";
import AlastikGallery from '@components/alastik/product/left/Gallery';
import AlastikMiddle from '@components/alastik/product/middle/Middle';
import AlastikAddCart from '@components/alastik/product/right/AddCart';
import AlastikMobileBuyBar from '@components/alastik/product/right/MobileBuyBar';
import AlastikDescription from '@components/alastik/product/bottom/Description';

/* Components - LastikJantAVM */
import LjaProductBreadcrumb from "@components/lastikjantavm/product/top/Breadcrumb";
import LjaGallery from '@components/lastikjantavm/product/left/Gallery';
import LjaMiddle from '@components/lastikjantavm/product/middle/Middle';
import LjaAddCart from '@components/lastikjantavm/product/right/AddCart';
import LjaMobileBuyBar from '@components/lastikjantavm/product/right/MobileBuyBar';
import LjaDescription from '@components/lastikjantavm/product/bottom/Description';

/* Services */
import { getProductBySlug, getProductWheelSize, getCompatibleVehicles, getRelatedBlogs } from '@src/services/productService';
import { getCategorySlugByName } from '@src/services/categoryService';
import { getDefinition } from '@src/services/definitionService';
import { getSeo } from '@src/services/seoService';
import { applyTemplate } from '@src/utils/seoTemplate';
import { getProductReviews } from '@src/services/reviewService';

export async function generateMetadata(
    { params }: { params: Promise<{ slug: string }> }
): Promise<Metadata> {
    const { slug } = await params;
    const product = await getProductBySlug(slug);
    if (!product) {
        return {
            title: 'Ürün Bulunamadı'
        };
    }

    const seo = await getSeo();
    const tpl = seo?.product;
    const urunAdi = product.diaData?.aciklama || 'Ürün';
    const markaAdi = product.diaData?.marka || '';
    const vars = {
        'urun-adi': urunAdi,
        'marka-adi': markaAdi,
        'urun-aciklamasi': `${urunAdi} en uygun fiyatla.`
    };

    // Custom seoTitle varsa sablonu atla, doğrudan goster
    const title = product.customData?.seoTitle
        ? product.customData.seoTitle
        : (applyTemplate(tpl?.titleTemplate, vars) || urunAdi);

    // Custom seoDescription varsa şablonu atla
    const description = product.customData?.seoDescription
        ? product.customData.seoDescription
        : (applyTemplate(tpl?.descriptionTemplate, vars) || vars['urun-aciklamasi']);

    return {
        title,
        description,
        keywords: product.customData?.seoKeywords?.join(', ')
            || applyTemplate(tpl?.keywordsTemplate, vars)
            || ''
    };
}
export default async function ProductDetailPage(

    { params }: { params: Promise<{ slug: string }> }
) {
    const site = headers().get('x-site') || 'alastik';
    const ProductBreadcrumb = site === 'lastikjantavm' ? LjaProductBreadcrumb : AlastikProductBreadcrumb;
    const Gallery = site === 'lastikjantavm' ? LjaGallery : AlastikGallery;
    const Middle = site === 'lastikjantavm' ? LjaMiddle : AlastikMiddle;
    const AddCart = site === 'lastikjantavm' ? LjaAddCart : AlastikAddCart;
    const MobileBuyBar = site === 'lastikjantavm' ? LjaMobileBuyBar : AlastikMobileBuyBar;
    const Description = site === 'lastikjantavm' ? LjaDescription : AlastikDescription;

    const { slug } = await params;
    const product = await getProductBySlug(slug);
    if (!product) {
        notFound();
    }

    // Sayfaya gömülen ürün verisinden gereksiz/gizli ham fiyat alanlarını temizle:
    // yalnız gösterim fiyatı (fiyat4) ve üstü çizili liste fiyatı (fiyat1) kalır.
    // fiyat2/fiyat3/fiyat10 (KDV hariç) + kdvdurumu alanları hem maliyet/marj sızıntısı
    // hem de Google'ın yanlış fiyat okumasına (Hatalı fiyat/KDV eksik) yol açıyordu.
    if (product?.diaData?.m_birimler?.length) {
        product.diaData.m_birimler = product.diaData.m_birimler.map((b: any) => ({
            birimadi: b.birimadi,
            birimkod: b.birimkod,
            carpan: b.carpan,
            fiyat1: b.fiyat1,
            fiyat4: b.fiyat4,
            miktar: b.miktar
        }));
    }

    const parseRimDiameter = (cap: string): number => {
        const match = cap?.match(/\d+/);
        return match ? parseInt(match[0]) : 0;
    };

    const genislik = product.diaData?.m_urunOzellikleri?.find((f: any) => f.ozellikadi === 'Genişlik')?.detayaciklama;
    const yanak = product.diaData?.m_urunOzellikleri?.find((f: any) => f.ozellikadi === 'Yanak')?.detayaciklama;
    const capRaw = product.diaData?.m_urunOzellikleri?.find((f: any) => f.ozellikadi === 'Jant Çapı')?.detayaciklama;
    const cap = parseRimDiameter(capRaw);

    const isLastikProduct = product.diaData?.ozelkod7kodu?.toUpperCase() === 'LASTİK';

    const ozelkod5 = product.diaData?.ozelkod5 || '';
    const patternMatch = ozelkod5.match(/^([a-z0-9-]+)/i);
    const blogPattern = patternMatch ? patternMatch[1].toLowerCase() : null;

    const [wheelSize, definition, reviews, compatibleVehicles, relatedBlogs] = await Promise.all([
        getProductWheelSize(slug),
        getDefinition(),
        getProductReviews(product._key),
        (isLastikProduct && genislik && yanak && cap)
            ? getCompatibleVehicles(parseInt(genislik), parseInt(yanak), cap)
            : null,
        (isLastikProduct && blogPattern)
            ? getRelatedBlogs(blogPattern)
            : []
    ]);

    const mainCategory = product.diaData?.m_kategoriler?.[0]?.kategori_aciklama_1;
    const categorySlug = await getCategorySlugByName(mainCategory);

    // Google Merchant/Shopping: ürün sayfasına yapısal fiyat verisi (JSON-LD).
    // Fiyat = sayfada görünen satış fiyatı (fiyat4) = feed fiyatı (LJA: fiyat1×B2C,
    // ALastik: fiyat2). Google'a fiyatı net söyleyerek "Hatalı fiyat / KDV eksik" giderilir.
    const siteDomain = site === 'lastikjantavm' ? 'https://lastikjantavm.com' : 'https://alastik.com';
    const salePrice = Number(product.diaData?.m_birimler?.[0]?.fiyat4) || 0;
    const jsonLdImagePath = product.diaData?.m_resimler?.[0]?.aws_url || product.customData?.featuredImage || '';
    const jsonLdImageUrl = jsonLdImagePath
        ? (jsonLdImagePath.startsWith('http') ? jsonLdImagePath : `${siteDomain}${jsonLdImagePath}`)
        : '';
    const productJsonLd = salePrice > 0 ? {
        '@context': 'https://schema.org/',
        '@type': 'Product',
        name: product.diaData?.aciklama || '',
        ...(jsonLdImageUrl ? { image: [jsonLdImageUrl] } : {}),
        sku: product.diaData?.stokkartkodu || product._key,
        ...(product.diaData?.marka ? { brand: { '@type': 'Brand', name: product.diaData.marka } } : {}),
        offers: {
            '@type': 'Offer',
            url: `${siteDomain}/urun/${slug}`,
            priceCurrency: 'TRY',
            price: salePrice.toFixed(2),
            itemCondition: 'https://schema.org/NewCondition',
            availability: (Number(product.diaData?.gercek_stok) || 0) > 0
                ? 'https://schema.org/InStock'
                : 'https://schema.org/OutOfStock',
            priceValidUntil: new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10)
        }
    } : null;

    return (
        <Container style={{ background: "#f6f6f6" }}>
            {productJsonLd && (
                <script
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }}
                />
            )}
            <Grid className="row-fluid" container>
                <Grid size={12}>
                    <ProductBreadcrumb
                        productName={product.diaData?.aciklama || ''}
                        categoryName={mainCategory}
                        categorySlug={categorySlug}
                    />
                </Grid>
            </Grid>
            <Grid className="row-fluid" container>
                <Grid size={{ xs: 12, md: 4 }}>
                    <Grid size={{ xs: 12, md: 10 }}>
                        <Gallery product={product} />
                    </Grid>
                </Grid>
                <Grid size={{ xs: 12, md: 5 }}>
                    <Middle
                        product={product}
                        productName={product.diaData?.aciklama || ''}
                        wheelSize={wheelSize}
                        reviews={reviews}
                    />
                </Grid>
                <Grid size={{ xs: 12, md: 3 }}>
                    <AddCart product={product} />
                </Grid>
            </Grid>

            {/* Yalnızca mobil: alta sabit fiyat + Şimdi Al + Sepete Ekle çubuğu.
                Lastiklerde sepete ekleme sonrası aynı ebattaki diğer lastikler önerilir.
                Bileşenin yer tutucu boşluğu (104px) DOM'daki yerinde açılır; alastik'te
                bilgi kartı ile Açıklama arasında boşluk kalmasın diye sayfanın sonuna alınır. */}
            {site === 'lastikjantavm' && (
                <MobileBuyBar
                    product={product}
                    similar={isLastikProduct && genislik && yanak && cap
                        ? { genislik: String(genislik), yanak: String(yanak), cap: String(cap) }
                        : null}
                />
            )}

            <Grid className="row-fluid" container>
                <Grid size={12}>
                    <Description
                        product={product}
                        wheelSize={wheelSize}
                        definition={definition}
                        reviews={reviews}
                        compatibleVehicles={compatibleVehicles}
                        relatedBlogs={relatedBlogs}
                    />
                </Grid>
            </Grid>

            {site !== 'lastikjantavm' && (
                <MobileBuyBar
                    product={product}
                    similar={isLastikProduct && genislik && yanak && cap
                        ? { genislik: String(genislik), yanak: String(yanak), cap: String(cap) }
                        : null}
                />
            )}
        </Container>
    );
}