"use client";

import {
  Grid,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Slider
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { useState } from "react";

export default function Price() {
  const [priceRange, setPriceRange] = useState<number[]>([25, 2344]);

  const handleChange = (event: Event, newValue: number | number[]) => {
    setPriceRange(newValue as number[]);
  };

  return (
    <Grid
      sx={{
        borderBottom: "1px solid #ddd",
        paddingBottom: "20px",
      }}
    >
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
          sx={{
            borderBottom: "none",
            p: 0,
          }}
        >
          <Typography variant="subtitle1" fontWeight="bold">
            Fiyat
          </Typography>
        </AccordionSummary>

        <AccordionDetails sx={{ padding: "0 15px" }}>
          <Slider
            value={priceRange}
            onChange={handleChange}
            min={25}
            max={2344}
            sx={{
              color: "#e2001a",
              "& .MuiSlider-thumb": {
                border: "2px solid #FFF",
              },
            }}
          />
          <Grid container justifyContent="space-between">
            <Typography variant="body2" sx={{fontSize: "12px", color: "#a4a4a4" }}>{priceRange[0]} TL</Typography>
            <Typography variant="body2" sx={{fontSize: "12px", color: "#a4a4a4" }}>{priceRange[1]} TL</Typography>
          </Grid>
        </AccordionDetails>
      </Accordion>
    </Grid>
  );
}
