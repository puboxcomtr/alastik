'use client';

import Link from "next/link";
import { Typography, Button, Box } from "@mui/material";

type Props = {
    title?: string
    subtitle?: string
    showAllLink?: string
    showAllText?: string
}

export default function SummerTireHeader({
    title = 'Yaz Oto Lastikleri',
    subtitle = "A Lastik'le Serin Sürüş",
    showAllLink = '/kategori',
    showAllText = 'Tümünü Gör'
}: Props) {
    return (
        <Box
            className="border-bottom py-3 py-md-4 mt-lg-2"
            display="flex"
            alignItems="center"
            justifyContent="space-between"
        >
            <Box display="flex" flexDirection="column">
                {subtitle && (
                    <Typography variant="subtitle2" sx={{ color: "#e2001a" }}>
                        {subtitle}
                    </Typography>
                )}
                {title && (
                    <Typography variant="h5" component="h2" sx={{ fontWeight: 700, mb: 0, fontSize: "1.75rem" }}>
                        {title}
                    </Typography>
                )}
            </Box>
            {showAllLink && (
                <Box ml={3}>
                    <Button
                        component={Link}
                        href={showAllLink}
                        variant="text"
                        className="animate-underline px-0 py-2"
                        endIcon={<i className="ci-chevron-right fs-base ms-1"></i>}
                    >
                        <span className="animate-target">{showAllText}</span>
                    </Button>
                </Box>
            )}
        </Box>
    );
}