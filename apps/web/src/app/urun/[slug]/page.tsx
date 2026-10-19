import React from 'react';
import { Container } from 'react-bootstrap';
import { Grid } from "@mui/material";
import { notFound } from 'next/navigation';
import { headers } from 'next/headers';
import type { Metadata } from 'next';

import AlastikProductBreadcrumb from "@components/alastik/product/top/Breadcrumb";
import AlastikGallery from '@components/alastik/product/left/Gallery';
import AlastikMiddle from '@components/alastik/product/middle/Middle';
import AlastikAddCart from '@components/alastik/product/right/AddCart';
import AlastikMobileBuyBar from '@components/alastik/product/right/MobileBuyBar';
import AlastikDescription from '@components/alastik/product/bottom/Description';

import LjaProductBreadcrumb from "@components/lastikjantavm/product/top/Breadcrumb";
import LjaGallery from '@components/lastikjantavm/product/left/Gallery';
import LjaMiddle from '@components/lastikjantavm/product/middle/Middle';
import LjaAddCart from '@components/lastikjantavm/product/right/AddCart';
import LjaMobileBuyBar from '@components/lastikjantavm/product/right/MobileBuyBar';
import LjaDescription from '@components/lastikjantavm/product/bottom/Description';

import { getProductBySlug, getProductWheelSize, getCompatibleVehicles, getRelatedBlogs } from '@src/services/productService';
import { getCategorySlugByName } from '@src/services/categoryService';
import { getDefinition } from '@src/services/definitionService';
import { getSeo } from '@src/services/seoService';
import { applyTemplate } from '@src/utils/seoTemplate';
import { getProductReviews } from '@src/services/reviewService';
import { canonicalMeta } from '@/src/lib/canonical';
import { JsonLd, breadcrumbJsonLd } from '@/src/lib/structuredData';
import Link from 'next/link';
import { BRANCHES } from '@/src/data/lja/subeler';
import { CATEGORY_NAME_TO_GROUP, getServiceGroup } from '@/src/data/lja/hizmetGruplari';
import VehiclesForSize from '@/src/components/lastikjantavm/seo/VehiclesForSize';

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

    const title = product.customData?.seoTitle
        ? product.customData.seoTitle
        : (applyTemplate(tpl?.titleTemplate, vars) || urunAdi);
    const ogImage = product.diaData?.m_resimler?.[0]?.aws_url || product.customData?.featuredImage || '';

    const description = product.customData?.seoDescription
        ? product.customData.seoDescription
        : (applyTemplate(tpl?.descriptionTemplate, vars) || vars['urun-aciklamasi']);

    return {
        title,
        description,
        keywords: product.customData?.seoKeywords?.join(', ')
            || applyTemplate(tpl?.keywordsTemplate, vars)
            || '',
        openGraph: {
            type: 'website',
            locale: 'tr_TR',
            title,
            description,
            url: `/urun/${slug}`,
            ...(ogImage ? { images: [{ url: ogImage, alt: urunAdi }] } : {})
        },
        ...(await canonicalMeta(`/urun/${slug}`))
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
    const serviceGroup = site === 'lastikjantavm'
        ? getServiceGroup(CATEGORY_NAME_TO_GROUP[product.diaData?.m_kategoriler?.[0]?.kategori_aciklama_2 || ''] || '')
        : undefined;
    const categorySlug = await getCategorySlugByName(mainCategory);

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
            <JsonLd data={breadcrumbJsonLd(siteDomain, [
                ...(mainCategory && categorySlug ? [{ name: mainCategory, path: `/kategori/${categorySlug}` }] : []),
                { name: product.diaData?.aciklama || '' }
            ])} />
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

            {site === 'lastikjantavm' && (
                <MobileBuyBar
                    product={product}
                    similar={isLastikProduct && genislik && yanak && cap
                        ? { genislik: String(genislik), yanak: String(yanak), cap: String(cap) }
                        : null}
                />
            )}

            {serviceGroup && (
                <div className="bg-white rounded-3 p-3 p-md-4 my-3">
                    <h2 className="fs-6 fw-bold mb-2">Bu hizmeti şubelerimizde alabilirsiniz</h2>
                    <ul className="mb-0">
                        {BRANCHES.map(b => (
                            <li key={b.slug}>
                                <Link href={`/subeler/${b.slug}/${serviceGroup.slug}`} className="text-black fw-semibold">
                                    {b.shortName} {serviceGroup.name}
                                </Link>
                            </li>
                        ))}
                    </ul>
                </div>
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

            {site === 'lastikjantavm' && isLastikProduct && genislik && yanak && cap > 0 && (
                <VehiclesForSize sizeKey={`${genislik}-${yanak}-r${cap}`} sizeLabel={`${genislik}/${yanak} R${cap}`} />
            )}

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