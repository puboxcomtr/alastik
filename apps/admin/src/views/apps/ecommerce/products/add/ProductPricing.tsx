import React from 'react';
import { Card, CardContent, Typography, TextField, Grid, Switch, FormControlLabel } from '@mui/material';

const ProductPricing = () => {
  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Fiyatlandırma
        </Typography>

        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Satış Fiyatı"
              variant="outlined"
              type="number"
              placeholder="0.00"
              InputProps={{
                startAdornment: <span>₺</span>,
              }}
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="İndirimli Fiyat"
              variant="outlined"
              type="number"
              placeholder="0.00"
              InputProps={{
                startAdornment: <span>₺</span>,
              }}
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Stok Miktarı"
              variant="outlined"
              type="number"
              placeholder="0"
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Minimum Sipariş"
              variant="outlined"
              type="number"
              placeholder="1"
            />
          </Grid>

          <Grid item xs={12}>
            <FormControlLabel
              control={<Switch defaultChecked />}
              label="Ürün Aktif"
            />
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
};

export default ProductPricing;
