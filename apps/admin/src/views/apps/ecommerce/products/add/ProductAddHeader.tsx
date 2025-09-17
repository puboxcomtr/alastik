'use client';

import React from 'react';
import { Card, CardContent, Typography, Breadcrumbs, Link } from '@mui/material';
import { useRouter } from 'next/navigation';

const ProductAddHeader = () => {
  const router = useRouter();

  return (
    <Card>
      <CardContent>
        <Breadcrumbs aria-label="breadcrumb" sx={{ mb: 2 }}>
          <Link
            underline="hover"
            color="inherit"
            href="/apps/ecommerce/products"
            onClick={(e) => {
              e.preventDefault();
              router.push('/apps/ecommerce/products');
            }}
          >
            Ürünler
          </Link>
          <Typography color="text.primary">Yeni Ürün Ekle</Typography>
        </Breadcrumbs>

        <Typography variant="h4" component="h1" gutterBottom>
          Yeni Ürün Ekle
        </Typography>

        <Typography variant="body2" color="text.secondary">
          Yeni bir ürün eklemek için aşağıdaki formu doldurun.
        </Typography>
      </CardContent>
    </Card>
  );
};

export default ProductAddHeader;
