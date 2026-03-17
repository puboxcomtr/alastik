/* Library */
import React from 'react';
import { Container } from 'react-bootstrap';
import { Grid } from "@mui/material";
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';


/* @Import Page */
import ProductBreadcrumb from "@components/product/top/Breadcrumb";
import Gallery from '@components/product/left/Gallery';
import Middle from '@components/product/middle/Middle';
import AddCart from '@/src/components/product/right/AddCart';
import Description from '@/src/components/product/bottom/Description';

/* Services */
import { getProductBySlug, getProductWheelSize, getCompatibleVehicles, getRelatedBlogs } from '@src/services/productService';
import { getCategorySlugByName } from '@src/services/categoryService';
import { getDefinition } from '@src/services/definitionService';
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

    return {
        title: product.customData?.seoTitle || product.diaData?.aciklama || 'Ürün Detay',
        description: product.customData?.seoDescription || '',
        keywords: product.customData?.seoKeywords?.join(', ') || ''
    };
}
export default async function ProductDetailPage(
    { params }: { params: Promise<{ slug: string }> }
) {
    const { slug } = await params;
    const product = await getProductBySlug(slug);
    if (!product) {
        notFound();
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

    return (
        <Container style={{ background: "#f6f6f6" }}>
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
        </Container>
    );
}