import React from 'react';
import { Card, CardContent, Typography, TextField, Grid, FormControl, InputLabel, Select, MenuItem } from '@mui/material';

const ProductOrganize = () => {
  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Organizasyon
        </Typography>

        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Sıralama"
              variant="outlined"
              type="number"
              placeholder="0"
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel>Durum</InputLabel>
              <Select label="Durum">
                <MenuItem value="active">Aktif</MenuItem>
                <MenuItem value="inactive">Pasif</MenuItem>
                <MenuItem value="draft">Taslak</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Etiketler"
              variant="outlined"
              placeholder="Etiketleri virgülle ayırın"
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Meta Başlık"
              variant="outlined"
              placeholder="SEO meta başlık"
            />
          </Grid>

          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Meta Açıklama"
              variant="outlined"
              multiline
              rows={3}
              placeholder="SEO meta açıklama"
            />
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
};

export default ProductOrganize;
