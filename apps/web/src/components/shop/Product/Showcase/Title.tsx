'use client';

import Link from "next/link";
import { Typography, Button, Box } from "@mui/material";

export default function SummerTireHeader() {
    return (
        <Box
            className="border-bottom py-3 py-md-4 mt-lg-2"
            display="flex"
            alignItems="center"
            justifyContent="space-between"
        >
            <Box display="flex" flexDirection="column">
                <Typography variant="subtitle2" sx={{ color: "#e2001a" }}>
                    A Lastik'le Serin Sürüş
                </Typography>
                <Typography variant="h5" component="h2" sx={{ fontWeight: 700, mb: 0, fontSize: "1.75rem"  }}>
                    Yaz Oto Lastikleri
                </Typography>
            </Box>
            <Box ml={3}>
                <Button
                    component={Link}
                    href="/category-detail"
                    variant="text"
                    className="animate-underline px-0 py-2"
                    endIcon={<i className="ci-chevron-right fs-base ms-1"></i>}
                >
                    <span className="animate-target">Tümünü Gör</span>
                </Button>
            </Box>
        </Box>
    );
}
