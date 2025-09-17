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
    Typography,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";

export default function Properties() {
    const [selectedProperties, setselectedProperties] = useState<number[]>([]);
    const handleToggle = (id: number) => {
        setselectedProperties((prev) =>
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
                    sx={{
                        borderBottom: "none",
                        p: 0,
                    }}
                >
                    <Typography variant="subtitle1" fontWeight="bold">
                        Özellikler
                    </Typography>
                </AccordionSummary>

                <AccordionDetails sx={{ padding: 0 }}>
                    <div
                        style={{
                            maxHeight: 210,
                            overflowY: "auto",
                            display: "flex",
                            flexDirection: "column",
                        }}
                    >
                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={selectedProperties.includes(1)}
                                    onChange={() => handleToggle(1)}
                                    size="small"
                                    sx={{ p: "5px 10px" }}
                                />
                            }
                            label={
                                <>
                                    <span style={{ color: "#000" }}>Run Flat</span>{" "}
                                    <span style={{ color: "#a4a4a4" }}>(120)</span>
                                </>
                            }
                        />
                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={selectedProperties.includes(1)}
                                    onChange={() => handleToggle(1)}
                                    size="small"
                                    sx={{ p: "5px 10px" }}
                                />
                            }
                            label={
                                <>
                                    <span style={{ color: "#000" }}>M+S Sembol</span>{" "}
                                    <span style={{ color: "#a4a4a4" }}>(48)</span>
                                </>
                            }
                        />
                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={selectedProperties.includes(1)}
                                    onChange={() => handleToggle(1)}
                                    size="small"
                                    sx={{ p: "5px 10px" }}
                                />
                            }
                            label={
                                <>
                                    <span style={{ color: "#000" }}>Elektrikli Araçlar</span>{" "}
                                    <span style={{ color: "#a4a4a4" }}>(35)</span>
                                </>
                            }
                        />
                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={selectedProperties.includes(1)}
                                    onChange={() => handleToggle(1)}
                                    size="small"
                                    sx={{ p: "5px 10px" }}
                                />
                            }
                            label={
                                <>
                                    <span style={{ color: "#000" }}>Jant Koruma Şeridi</span>{" "}
                                    <span style={{ color: "#a4a4a4" }}>(15)</span>
                                </>
                            }
                        />
                    </div>
                </AccordionDetails>
            </Accordion>
        </Grid>
    );
}
