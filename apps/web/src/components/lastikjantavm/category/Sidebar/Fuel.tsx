"use client";
import { useState } from "react";
import {
  Grid,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Checkbox,
  FormControlLabel,
  Typography,
  Box
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";

const fuelData = [
  { id: 1, label: "A", count: 1555, color: "#2e7d32" },
  { id: 2, label: "B", count: 4748, color: "#66bb6a" },
  { id: 3, label: "C", count: 20067, color: "#fdd835" },
  { id: 4, label: "D", count: 14288, color: "#f57c00" },
  { id: 5, label: "E", count: 1518, color: "#d32f2f" }, 
];

export default function FuelEfficiency() {
  const [selected, setSelected] = useState<number[]>([]);

  const handleToggle = (id: number) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((b) => b !== id) : [...prev, id]
    );
  };

  return (
    <Grid sx={{ borderBottom: "1px solid #ddd", paddingBottom: "20px" }}>
      <Accordion
        defaultExpanded
        sx={{
          boxShadow: "none",
          border: "none",
          "&:before": { display: "none" },
        }}
      >
        <AccordionSummary
          expandIcon={<ExpandMoreIcon />}
          sx={{ borderBottom: "none", p: 0 }}
        >
          <Typography variant="subtitle1" fontWeight="bold">
            Yakıt verimliliği
          </Typography>
        </AccordionSummary>

        <AccordionDetails sx={{ padding: 0 }}>
          <div
            style={{
              maxHeight: 250,
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
            }}
          >
            {fuelData.map((item) => (
              <FormControlLabel
                key={item.id}
                control={
                  <Checkbox
                    checked={selected.includes(item.id)}
                    onChange={() => handleToggle(item.id)}
                    size="small"
                    sx={{ p: "5px 10px" }}
                  />
                }
                label={
                  <Box sx={{ display: "flex", alignItems: "center" }}>
                    <Box
                      sx={{
                        backgroundColor: item.color,
                        color: "#fff",
                        px: 1.5,
                        py: 0.2,
                        borderRadius: "3px",
                        minWidth: "25px",
                        textAlign: "center",
                        fontSize: "0.75rem",
                      }}
                    >
                      {item.label}
                    </Box>
                    <Typography
                      component="span"
                      sx={{ color: "#a4a4a4", ml: 1, fontSize: "14px" }}
                    >
                      ({item.count})
                    </Typography>
                  </Box>
                }
              />
            ))}
          </div>
        </AccordionDetails>
      </Accordion>
    </Grid>
  );
}
