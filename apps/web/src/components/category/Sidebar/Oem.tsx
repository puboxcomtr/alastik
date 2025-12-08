"use client";

import {
    Grid, TextField, MenuItem, Tooltip, Typography,
    Accordion, AccordionSummary, AccordionDetails,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { useRouter, useSearchParams, usePathname } from "next/navigation";

interface OemOption {
    value: string;
    count: number;
}

interface OemProps {
    oemOptions?: OemOption[];
}

export default function Oem({ oemOptions = [] }: OemProps) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const currentOem = searchParams.get('oem') || 'all';

    const handleChange = (value: string) => {
        const params = new URLSearchParams(searchParams.toString());

        if (value === 'all') {
            params.delete('oem');
        } else {
            params.set('oem', value);
        }
        params.delete('sayfa');

        const queryString = params.toString();
        router.push(queryString ? `${pathname}?${queryString}` : pathname);
    };
    if (!oemOptions || oemOptions.length === 0) {
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
                        Orjinal Ekipman
                    </Typography>
                    <Tooltip
                        title={
                            <Typography variant="body2" sx={{ maxWidth: 300 }}>
                                Orijinal Ekipman Üreticisi (OEM) lastikleri, otomobil üreticisi ile lastik endüstrisinin yakın iş birliği içinde geliştirilir. Bu lastiklerin yanak kısmında OEM işaretlemesi bulunur, örneğin Mercedes-Benz için "MO", BMW için "*" ve Audi için "AO" gibi.
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
                        value={currentOem}
                        onChange={(e) => handleChange(e.target.value)}
                    >
                        <MenuItem value="all" sx={{ fontSize: '13px', borderBottom: '1px solid #eee' }}>Tümü</MenuItem>
                        {oemOptions.map((oem, index) => (
                            <MenuItem
                                key={index}
                                value={oem.value}
                                sx={{
                                    fontSize: '13px',
                                    borderBottom: '1px solid #eee'
                                }}
                            >
                                {oem.label || oem.value}
                            </MenuItem>
                        ))}
                    </TextField>
                </AccordionDetails>
            </Accordion>
        </Grid>
    );
}