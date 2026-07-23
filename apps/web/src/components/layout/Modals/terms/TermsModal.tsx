'use client';

import React from 'react';
import { Modal, Box, IconButton } from '@mui/material';
import { useDefinition } from '@/src/hooks/Theme/useDefinition';

type TermsType = 'mesafeli-satis' | 'on-bilgilendirme';

interface TermsModalProps {
    open: boolean;
    onClose: () => void;
    type: TermsType;
}

const TERMS_MAP: Record<TermsType, { title: string; field: 'salesAgreement' | 'preInformation' }> = {
    'mesafeli-satis': { title: 'Mesafeli Satış Sözleşmesi', field: 'salesAgreement' },
    'on-bilgilendirme': { title: 'Ön Bilgilendirme Formu', field: 'preInformation' },
};

export default function TermsModal({ open, onClose, type }: TermsModalProps) {
    const { definition, loading } = useDefinition();
    const { title, field } = TERMS_MAP[type];
    const content = definition?.legalContracts?.[field] || '';

    return (
        <Modal open={open} onClose={onClose}>
            <Box sx={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: { xs: '95%', sm: '90%', md: 700 },
                maxHeight: '85vh',
                bgcolor: 'background.paper',
                borderRadius: 2,
                boxShadow: 24,
                display: 'flex',
                flexDirection: 'column'
            }}>
                <Box sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    p: 2,
                    borderBottom: '1px solid #eee'
                }}>
                    <h5 className="mb-0">{title}</h5>
                    <IconButton onClick={onClose} size="small">
                        <i className="ri-close-line"></i>
                    </IconButton>
                </Box>

                <Box sx={{
                    p: 3,
                    overflowY: 'auto',
                    flex: 1
                }}>
                    {loading ? (
                        <p className="text-muted mb-0">Yükleniyor...</p>
                    ) : content ? (
                        <div
                            className="terms-content"
                            dangerouslySetInnerHTML={{ __html: content }}
                        />
                    ) : (
                        <p className="text-muted mb-0">İçerik bulunamadı.</p>
                    )}
                </Box>

                <Box sx={{
                    p: 2,
                    borderTop: '1px solid #eee',
                    textAlign: 'right'
                }}>
                    <button className="btn btn-primary" onClick={onClose}>
                        Kapat
                    </button>
                </Box>
            </Box>
        </Modal>
    );
}