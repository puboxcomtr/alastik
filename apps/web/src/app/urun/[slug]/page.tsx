/* Library */
import React from 'react';
import { Container } from 'react-bootstrap';
import { Grid } from "@mui/material";
import { notFound } from 'next/navigation';

/* @Import Page */
import ProductBreadcrumb from "@components/product/top/Breadcrumb";
import Gallery from '@components/product/left/Gallery';
import Middle from '@components/product/middle/Middle';
import AddCart from '@/src/components/product/right/AddCart';

/* Services */
import { getProductBySlug } from '@src/services/productService';
import { getCategorySlugByName } from '@src/services/categoryService';

export default async function ProductDetailPage(
    { params }: { params: Promise<{ slug: string }> }
) {
    const { slug } = await params;
    const product = await getProductBySlug(slug);

    if (!product) {
        notFound();
    }

    // DIA'dan sadece ana kategori al
    const mainCategory = product.diaData?.m_kategoriler?.[0]?.kategori_aciklama_1;

    // Ana kategori slug'ını getir
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
                <Grid size={4}>
                    <Grid size={10}>
                        <Gallery product={product} />
                    </Grid>
                </Grid>
                <Grid size={5}>
                    <Middle
                        product={product}
                        productName={product.diaData?.aciklama || ''}
                    />
                </Grid>
                <Grid size={3} sx={{ pl: 3 }}>
                    <AddCart product={product} />
                </Grid>
            </Grid>
        </Container>
    );
}