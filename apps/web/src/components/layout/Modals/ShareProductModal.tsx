"use client";
import React, { useState, useEffect } from "react";
import { Dialog, DialogTitle, DialogContent, IconButton, Typography, Box, Tooltip } from '@mui/material';
import { Product } from '@/src/types/products';
import { getProductUrl } from '@/src/hooks/Products/productHelpers';

interface ShareProductModalProps {
    open: boolean;
    onClose: () => void;
    product: Product;
}

export default function ShareProductModal({ open, onClose, product }: ShareProductModalProps) {
    const [shareUrl, setShareUrl] = useState('');
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        if (open && typeof window !== 'undefined') {
            // Tam URL'yi oluştur (origin + ürün yolu)
            const productPath = getProductUrl(product);
            const fullUrl = `${window.location.origin}${productPath}`;
            setShareUrl(fullUrl);
            setCopied(false);
        }
    }, [open, product]);

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(shareUrl);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Kopyalama hatası:', err);
        }
    };

    const productTitle = product?.diaData?.aciklama || 'Ürün';
    const encodedUrl = encodeURIComponent(shareUrl);
    const encodedTitle = encodeURIComponent(productTitle);

    const socialLinks = [
        {
            name: 'Facebook',
            url: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
            icon: 'ri-facebook-fill',
            color: '#1877F2'
        },
        {
            name: 'X',
            url: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`,
            icon: 'ri-twitter-x-fill',
            color: '#000000'
        },
        {
            name: 'Email',
            url: `mailto:?subject=${encodedTitle}&body=${encodedUrl}`,
            icon: 'ri-mail-fill',
            color: '#EA4335'
        },
        {
            name: 'WhatsApp',
            url: `https://api.whatsapp.com/send?text=${encodedTitle}%20${encodedUrl}`,
            icon: 'ri-whatsapp-fill',
            color: '#25D366'
        },
        {
            name: 'LinkedIn',
            url: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
            icon: 'ri-linkedin-fill',
            color: '#0A66C2'
        }
    ];

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="sm"
            fullWidth
            sx={{
                '& .MuiDialog-container': {
                    alignItems: 'center'
                }
            }}
        >
            <DialogTitle sx={{ pb: 1 }}>
                <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>Ürünü Paylaş</Typography>
                    <IconButton
                        onClick={onClose}
                        sx={{ position: 'absolute', right: 8, top: 8 }}
                    >
                        <i className="ri-close-line"></i>
                    </IconButton>
                </Box>
            </DialogTitle>
            <DialogContent dividers sx={{ pt: 3, pb: 4 }}>
                {/* Bağlantıyı Kopyala */}
                <Box mb={3}>
                    <Typography
                        variant="body2"
                        sx={{ fontWeight: 600, mb: 1, color: 'text.primary' }}
                    >
                        Bağlantıyı Kopyala
                    </Typography>
                    <Box
                        sx={{
                            display: 'flex',
                            alignItems: 'center',
                            border: '1px solid #dee2e6',
                            borderRadius: '8px',
                            overflow: 'hidden',
                            backgroundColor: '#f8f9fa'
                        }}
                    >
                        <input
                            type="text"
                            value={shareUrl}
                            readOnly
                            style={{
                                flex: 1,
                                border: 'none',
                                outline: 'none',
                                padding: '10px 12px',
                                fontSize: '14px',
                                backgroundColor: 'transparent',
                                color: '#495057'
                            }}
                        />
                        <Tooltip
                            title={copied ? 'Kopyalandı' : 'Bağlantıyı Kopyala'}
                            open={copied ? true : undefined}
                            arrow
                            placement="top"
                        >
                            <IconButton
                                onClick={handleCopy}
                                sx={{
                                    borderRadius: 0,
                                    backgroundColor: '#fff',
                                    borderLeft: '1px solid #dee2e6',
                                    height: '100%',
                                    px: 2,
                                    '&:hover': {
                                        backgroundColor: '#e9ecef'
                                    }
                                }}
                            >
                                <i className={copied ? 'ri-check-line' : 'ri-file-copy-line'}
                                    style={{ fontSize: '18px', color: copied ? '#28a745' : '#495057' }}>
                                </i>
                            </IconButton>
                        </Tooltip>
                    </Box>
                </Box>

                {/* Sosyal Medya Butonları */}
                <Box>
                    <Typography
                        variant="body2"
                        sx={{ fontWeight: 600, mb: 2, color: 'text.primary' }}
                    >
                        Sosyal Medyada Paylaş
                    </Typography>
                    <Box display="flex" gap={1.5} flexWrap="wrap" justifyContent="center">
                        {socialLinks.map((link) => (
                            <Tooltip key={link.name} title={link.name} arrow placement="top">
                                <a
                                    href={link.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        width: '48px',
                                        height: '48px',
                                        borderRadius: '50%',
                                        backgroundColor: link.color,
                                        color: '#fff',
                                        textDecoration: 'none',
                                        transition: 'transform 0.2s ease',
                                        fontSize: '22px'
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.transform = 'scale(1.1)';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.transform = 'scale(1)';
                                    }}
                                >
                                    <i className={link.icon}></i>
                                </a>
                            </Tooltip>
                        ))}
                    </Box>
                </Box>
            </DialogContent>
        </Dialog>
    );
}