"use client";

import {
    Grid, TextField, MenuItem, Tooltip, Typography, FormControl,
    Accordion,
    AccordionSummary,
    AccordionDetails,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { useState } from "react";

const carBrand = [
    { id: 1, brand: "Alfa Romeo", count: 42 },
    { id: 2, brand: "Audi", count: 58 },
    { id: 3, brand: "BMW", count: 76 },
    { id: 4, brand: "Citroën", count: 33 },
    { id: 5, brand: "Fiat", count: 65 },
    { id: 6, brand: "Ford", count: 88 },
    { id: 7, brand: "Honda", count: 40 },
    { id: 8, brand: "Hyundai", count: 55 },
    { id: 9, brand: "Mercedes-Benz", count: 70 },
    { id: 10, brand: "Volkswagen", count: 95 }
];

export default function TireFilters() {
    /* Input Değiştirme Fonksiyonları */
    const [oem, setoem] = useState("all");
    return (
        <>
            <Grid sx={{
                borderBottom: "1px solid #ddd",
                paddingBottom: "20px"
            }}>
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
                            Orjinal Ekipman
                        </Typography>
                        <Tooltip
                            title={
                                <Typography variant="body2" sx={{ maxWidth: 300 }}>
                                    Orijinal Ekipman Üreticisi (OEM) lastikleri, otomobil üreticisi ile lastik endüstrisinin yakın iş birliği içinde geliştirilir. Sonuç olarak, ilgili araca mükemmel şekilde uyum sağlayan, optimum güvenlik ve sürüş deneyimi sunan lastikler ortaya çıkar. Bu lastiklerin yanak kısmında OEM işaretlemesi bulunur, örneğin Mercedes-Benz için "MO" ve araç üreticisi tarafından onaylanmıştır. Elbette bu lastikler diğer araçlarda da kullanılabilir. 
                                </Typography>
                            }
                            arrow
                            placement="right"
                        >
                            <i
                                className="ri-information-line"
                                style={{ fontSize: 18, cursor: "pointer", color: "#555", marginLeft: 5 }}
                            />
                        </Tooltip>
                    </AccordionSummary>

                    <AccordionDetails sx={{ padding: 0 }}>
                        <FormControl fullWidth>
                            <TextField
                                select
                                fullWidth
                                size="small"
                                value={oem}
                                onChange={(e) => setoem(e.target.value)}
                                SelectProps={{
                                    MenuProps: {
                                        PaperProps: {
                                            style: {
                                                maxHeight: 200,
                                                overflowY: "auto",
                                            },
                                        },
                                    },
                                    IconComponent: (props) => (
                                        <i
                                            {...props}
                                            className="ri-arrow-down-s-line"
                                            style={{ color: "#555", fontSize: 20 }}
                                        />
                                    ),
                                }}
                                sx={{
                                    backgroundColor: "#f5f5f5",
                                    borderRadius: 1,
                                }}
                            >
                                <MenuItem value="all">Tümü</MenuItem>
                                {carBrand.map(car => (
                                    <MenuItem key={car.id} value={car.brand}>
                                        {car.brand} ({car.count})
                                    </MenuItem>
                                ))}
                            </TextField>
                        </FormControl>
                    </AccordionDetails>
                </Accordion>
            </Grid>
        </>
    );
}
