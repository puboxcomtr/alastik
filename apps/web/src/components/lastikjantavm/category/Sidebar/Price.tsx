"use client";

import {
  Grid, Typography, Accordion, AccordionSummary, AccordionDetails, Slider
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { useState, useEffect } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";

interface PriceProps {
  priceRange?: {
    min: number;
    max: number;
  };
}

export default function Price({ priceRange }: PriceProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const minPrice = priceRange?.min || 0;
  const maxPrice = priceRange?.max || 50000;

  // URL'den mevcut değerleri al
  const urlMin = searchParams.get('fiyatMin');
  const urlMax = searchParams.get('fiyatMax');

  const [values, setValues] = useState<number[]>([
    urlMin ? parseInt(urlMin) : minPrice,
    urlMax ? parseInt(urlMax) : maxPrice
  ]);

  // priceRange değiştiğinde güncelle
  useEffect(() => {
    if (!urlMin && !urlMax && priceRange) {
      setValues([priceRange.min, priceRange.max]);
    }
  }, [priceRange, urlMin, urlMax]);

  const handleChange = (event: Event, newValue: number | number[]) => {
    setValues(newValue as number[]);
  };

  const handleChangeCommitted = (event: React.SyntheticEvent | Event, newValue: number | number[]) => {
    const [min, max] = newValue as number[];
    const params = new URLSearchParams(searchParams.toString());

    // Sadece varsayılandan farklıysa URL'e ekle
    if (min > minPrice) {
      params.set('fiyatMin', min.toString());
    } else {
      params.delete('fiyatMin');
    }

    if (max < maxPrice) {
      params.set('fiyatMax', max.toString());
    } else {
      params.delete('fiyatMax');
    }

    // Sayfa parametresini sıfırla
    params.delete('sayfa');

    const queryString = params.toString();
    router.push(queryString ? `${pathname}?${queryString}` : pathname);
  };

  // Fiyat aralığı yoksa gösterme
  if (!priceRange || maxPrice <= minPrice) {
    return null;
  }

  return (
    <Grid sx={{ borderBottom: "1px solid #ddd", paddingBottom: "20px" }}>
      <Accordion
        defaultExpanded
        sx={{
          boxShadow: "none",
          marginTop: "10px",
          "&:before": { display: "none" },
        }}
      >
        <AccordionSummary
          expandIcon={<ExpandMoreIcon />}
          sx={{ borderBottom: "none", p: 0 }}
        >
          <Typography variant="subtitle1" fontWeight="bold">
            Fiyat
          </Typography>
        </AccordionSummary>

        <AccordionDetails sx={{ padding: "0 15px" }}>
          <Slider
            value={values}
            onChange={handleChange}
            onChangeCommitted={handleChangeCommitted}
            min={minPrice}
            max={maxPrice}
            valueLabelDisplay="auto"
            valueLabelFormat={(value) => `${value.toLocaleString('tr-TR')} TL`}
            sx={{
              color: "#e0cd00",
              "& .MuiSlider-thumb": {
                border: "2px solid #FFF",
              },
            }}
          />
          <Grid container justifyContent="space-between">
            <Typography variant="body2" sx={{ fontSize: "12px", color: "#a4a4a4" }}>
              {values[0].toLocaleString('tr-TR')} TL
            </Typography>
            <Typography variant="body2" sx={{ fontSize: "12px", color: "#a4a4a4" }}>
              {values[1].toLocaleString('tr-TR')} TL
            </Typography>
          </Grid>
        </AccordionDetails>
      </Accordion>
    </Grid>
  );
}