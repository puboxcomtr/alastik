// apps/web/src/components/category/Sidebar/SpeedIndex.tsx
"use client";

import {
    Grid, TextField, MenuItem, Tooltip, Typography,
    Accordion, AccordionSummary, AccordionDetails,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { useRouter, useSearchParams, usePathname } from "next/navigation";

interface IndexOption {
    value: string;
    label?: string;
    count?: number;
}

interface SpeedIndexProps {
    loadIndexOptions?: IndexOption[];
    speedIndexOptions?: IndexOption[];
}

export default function SpeedIndex({ loadIndexOptions = [], speedIndexOptions = [] }: SpeedIndexProps) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const currentLoadIndex = searchParams.get('yukEndeksi') || 'all';
    const currentSpeedIndex = searchParams.get('hizEndeksi') || 'all';

    const handleChange = (param: string, value: string) => {
        const params = new URLSearchParams(searchParams.toString());

        if (value === 'all') {
            params.delete(param);
        } else {
            params.set(param, value);
        }

        params.delete('sayfa');

        const queryString = params.toString();
        router.push(queryString ? `${pathname}?${queryString}` : pathname);
    };

    return (
        <Grid sx={{ borderBottom: "1px solid #ddd", paddingBottom: "20px" }}>
            {/* Yük Endeksi Accordion */}
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
                        Yük Endeksi
                    </Typography>
                    <Tooltip
                        title={
                            <Typography variant="body2" sx={{ maxWidth: 300 }}>
                                Lastiğin taşıyabileceği maksimum yükü belirtir.
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
                    <TextField
                        select
                        fullWidth
                        size="small"
                        value={currentLoadIndex}
                        onChange={(e) => handleChange('yukEndeksi', e.target.value)}
                    >
                        <MenuItem value="all" sx={{ fontSize: '13px', borderBottom: '1px solid #eee' }}>
                            Tümü
                        </MenuItem>
                        {loadIndexOptions.map((opt, index) => (
                            <MenuItem
                                key={index}
                                value={opt.value}
                                sx={{
                                    fontSize: '13px',
                                    borderBottom: '1px solid #eee',
                                    '&:last-child': { borderBottom: 'none' }
                                }}
                            >
                                {opt.label || opt.value}
                            </MenuItem>
                        ))}
                    </TextField>
                </AccordionDetails>
            </Accordion>

            {/* Hız Endeksi Accordion */}
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
                        Hız Endeksi
                    </Typography>
                    <Tooltip
                        title={
                            <Typography variant="body2" sx={{ maxWidth: 300 }}>
                                Lastiğin güvenli şekilde ulaşabileceği maksimum hızı gösterir.
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
                    <TextField
                        select
                        fullWidth
                        size="small"
                        value={currentSpeedIndex}
                        onChange={(e) => handleChange('hizEndeksi', e.target.value)}
                    >
                        <MenuItem value="all" sx={{ fontSize: '13px', borderBottom: '1px solid #eee' }}>
                            Tümü
                        </MenuItem>
                        {speedIndexOptions.map((opt, index) => (
                            <MenuItem
                                key={index}
                                value={opt.value}
                                sx={{
                                    fontSize: '13px',
                                    borderBottom: '1px solid #eee',
                                    '&:last-child': { borderBottom: 'none' }
                                }}
                            >
                                {opt.label || opt.value}
                            </MenuItem>
                        ))}
                    </TextField>
                </AccordionDetails>
            </Accordion>
        </Grid>
    );
}