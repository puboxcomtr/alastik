import React from 'react';
import { Card, CardContent, Typography, TextField, Grid, FormControl, InputLabel, Select, MenuItem } from '@mui/material';

const ProductInformation = () => {
  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Ürün Bilgileri
        </Typography>

        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Ürün Adı"
              variant="outlined"
              placeholder="Ürün adını girin"
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="SKU"
              variant="outlined"
              placeholder="Stok kodu"
            />
          </Grid>

          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Açıklama"
              variant="outlined"
              multiline
              rows={4}
              placeholder="Ürün açıklaması"
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel>Kategori</InputLabel>
              <Select label="Kategori">
                <MenuItem value="lastik">Lastik</MenuItem>
                <MenuItem value="jant">Jant</MenuItem>
                <MenuItem value="aksesuar">Aksesuar</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel>Marka</InputLabel>
              <Select label="Marka">
                <MenuItem value="michelin">Michelin</MenuItem>
                <MenuItem value="pirelli">Pirelli</MenuItem>
                <MenuItem value="bridgestone">Bridgestone</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
};

export default ProductInformation;
