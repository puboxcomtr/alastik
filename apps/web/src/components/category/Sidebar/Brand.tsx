"use client";
import { useState } from "react";
/* MUI */
import {
    Grid,
    Accordion,
    AccordionSummary,
    AccordionDetails,
    Checkbox,
    FormControlLabel,
    TextField,
    Typography,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";

const brandData = [
    { id: 1, name: "Pirelli", order: 1, status: true, count: 120 },
    { id: 2, name: "Hankook", order: 2, status: true, count: 95 },
    { id: 3, name: "Michelin", order: 3, status: true, count: 180 },
    { id: 4, name: "Goodyear", order: 4, status: true, count: 150 },
    { id: 5, name: "Bridgestone", order: 5, status: true, count: 200 },
    { id: 6, name: "Continental", order: 6, status: true, count: 175 },
    { id: 7, name: "Dunlop", order: 7, status: true, count: 140 },
    { id: 8, name: "Falken", order: 8, status: true, count: 80 },
    { id: 9, name: "Toyo", order: 9, status: true, count: 60 },
    { id: 10, name: "Nokian", order: 10, status: true, count: 45 },
    { id: 11, name: "Kumho", order: 11, status: true, count: 75 },
    { id: 12, name: "Yokohama", order: 12, status: true, count: 110 },
    { id: 13, name: "Petlas", order: 13, status: true, count: 130 },
    { id: 14, name: "Lassa", order: 14, status: true, count: 90 },
    { id: 15, name: "Aptany", order: 15, status: true, count: 40 },
    { id: 16, name: "Goodride", order: 16, status: true, count: 55 },
    { id: 17, name: "Linglong", order: 17, status: true, count: 30 },
    { id: 18, name: "Zetum", order: 18, status: true, count: 20 },
    { id: 19, name: "GT Radial", order: 19, status: true, count: 35 },
    { id: 20, name: "Marshal", order: 20, status: true, count: 25 },
    { id: 21, name: "Sumitomo", order: 21, status: true, count: 50 },
    { id: 22, name: "Sava", order: 22, status: true, count: 65 },
    { id: 23, name: "Roadstone", order: 23, status: true, count: 70 },
    { id: 24, name: "Apollo", order: 24, status: true, count: 85 },
    { id: 25, name: "Ceat", order: 25, status: true, count: 15 },
    { id: 26, name: "Westlake", order: 26, status: true, count: 22 },
    { id: 27, name: "Vredestein", order: 27, status: true, count: 12 },
    { id: 28, name: "Cooper", order: 28, status: true, count: 18 },
    { id: 29, name: "Avon", order: 29, status: true, count: 10 },
    { id: 30, name: "Firestone", order: 30, status: true, count: 44 }
];


export default function Brand() {
    const [selectedBrands, setSelectedBrands] = useState<number[]>([]);
    const [search, setSearch] = useState("");

    const handleToggle = (id: number) => {
        setSelectedBrands((prev) =>
            prev.includes(id) ? prev.filter((b) => b !== id) : [...prev, id]
        );
    };

    const filteredBrands = brandData
        .filter((brand) => brand.status)
        .sort((a, b) => a.order - b.order)
        .filter((brand) =>
            brand.name.toLowerCase().includes(search.toLowerCase())
        );

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
                    sx={{
                        borderBottom: "none",
                        p: 0,
                    }}
                >
                    <Typography variant="subtitle1" fontWeight="bold">
                        Marka
                    </Typography>
                </AccordionSummary>

                <AccordionDetails sx={{ padding: 0 }}>
                    <TextField
                        variant="outlined"
                        fullWidth
                        size="small"
                        placeholder="Marka ara..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        sx={{ mb: 2 }}
                    />

                    <div style={{ maxHeight: 210, overflowY: "auto", display: "flex", flexDirection: "column" }}>
                        {filteredBrands.map((brand) => (
                            <FormControlLabel
                                key={brand.id}
                                control={
                                    <Checkbox
                                        checked={selectedBrands.includes(brand.id)}
                                        onChange={() => handleToggle(brand.id)}
                                        size="small"
                                        sx={{ p: "5px 10px" }}
                                    />
                                }
                                label={
                                    <>

                                        <span style={{ color: "#000" }}>{brand.name}</span>{" "}
                                        <span style={{ color: "#a4a4a4" }}>({brand.count})</span>
                                    </>
                                }
                                sx={{
                                    "& .MuiFormControlLabel-label": {
                                        fontSize: "0.955rem",
                                        width: "100%"
                                    },
                                }}
                            />
                        ))}
                    </div>
                </AccordionDetails>
            </Accordion>
        </Grid>

    );
}
