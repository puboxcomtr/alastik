/* Library */
import React from 'react';
import { Col, Container, Row } from 'react-bootstrap';
import { Grid } from "@mui/material";

/* @Import Page */
import ProductBreadcrumb from "@/src/components/product/top/Breadcrumb";
import Garage from '@components/product/top/Garage';
import Gallery from '@/src/components/product/left/Gallery';
import Middle from '@/src/components/product/middle/Middle';

interface CategoryPageProps {
  params: {
    slug: string;
  };
}

export default async function ProductDetailPage(
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  return (
    <Container style={{ background: "#f6f6f6" }}>
      <Grid className="row-fluid" container>
        <Grid size={12}>
          <ProductBreadcrumb productName="Pirelli SottoZero Serie 3 RFT BMW(*) Mercedes (MO) 245/45R18 100V XL" />
        </Grid>
        <Grid size={12}>
          <Garage />
        </Grid>
      </Grid>
      <Grid className="row-fluid" container>
        <Grid size={4}>
          <Grid size={10}>
            <Gallery />
          </Grid>
        </Grid>
        <Grid size={4}>
          <Middle />
        </Grid>
        <Grid size={4}>
          Sepete Ekle
        </Grid>
      </Grid>
    </Container>
  );
}