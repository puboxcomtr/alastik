'use client';

// ============================================
// React & Next.js
// ============================================
import { useState, useEffect, useMemo } from 'react';

// ============================================
// MUI 
// ============================================
import { Typography, Divider, Box, Tooltip, Link } from '@mui/material';

// ============================================
// Hooks
// ============================================
import { useWheelSize } from '@/src/hooks/WheelSize/useWheelSize';
import { useTranslations } from '@/src/hooks/Theme/useTranslations';
import { useAuth } from '@src/hooks/Theme/useAuth';

// ============================================
// Types
// ============================================
import type { WheelSizeMake } from '@/src/types/vehicle';

// ============================================
// Routes
// ============================================
import { ROUTES } from '@/src/config/routes';

// ============================================
// Variable
// ============================================
const POPULAR_MAKES = [
    'audi', 'bmw', 'mercedes-benz', 'volkswagen',
    'ford', 'renault', 'opel', 'peugeot',
    'toyota', 'honda', 'hyundai', 'kia'
];

export default function MakeSelection({ selectedMake, onSelect }: MakeSelectionProps) {
    const { isLoggedIn, user, loading: authLoading } = useAuth();
    const { getMakes, loading } = useWheelSize();
    const [allMakes, setAllMakes] = useState<WheelSizeMake[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [showAll, setShowAll] = useState(false);
    const { t } = useTranslations('general');

    useEffect(() => {
        loadMakes();
    }, []);

    const loadMakes = async () => {
        const makes = await getMakes();
        setAllMakes(makes);
    };

    const popularMakes = useMemo(() => {
        return allMakes.filter(make => POPULAR_MAKES.includes(make.slug));
    }, [allMakes]);

    const searchResults = useMemo(() => {
        if (!searchTerm.trim()) return [];
        const term = searchTerm.toLowerCase();
        return allMakes.filter(make =>
            make.name.toLowerCase().includes(term) ||
            make.slug.toLowerCase().includes(term)
        );
    }, [allMakes, searchTerm]);

    const displayedMakes = useMemo(() => {
        if (searchTerm.trim()) return searchResults;
        if (showAll) return allMakes;
        return popularMakes;
    }, [searchTerm, showAll, searchResults, popularMakes, allMakes]);

    const handleMakeClick = (make: WheelSizeMake) => {
        onSelect(make.slug, make.name);
    };

    if (loading) {
        return (
            <div className="text-center py-5">
                <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Yükleniyor...</span>
                </div>
                <p className="mt-3 text-muted">Markalar yükleniyor...</p>
            </div>
        );
    }

    return (
        <div className="make-selection">
            <div className="row">
                <div className="col-md-8">
                    {/* Arama */}
                    <div className="mb-4">
                        <div style={{ position: 'relative' }}>
                            <input
                                type="text"
                                value={searchTerm}
                                className="form-control form-control-sm"
                                placeholder="Aramak istediğiniz marka"
                                style={{
                                    borderRadius: '5px',
                                    border: '1px solid black',
                                    padding: '0.75rem',
                                    paddingRight: '2.5rem'
                                }}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                            <i
                                className="ri-search-line"
                                style={{
                                    position: 'absolute',
                                    right: '1rem',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    pointerEvents: 'none',
                                    color: '#6c757d'
                                }}
                            ></i>
                        </div>
                    </div>
                    {/* Marka Grid */}
                    {displayedMakes.length > 0 ? (
                        <>
                            <div className="row g-2">
                                {displayedMakes.map((make) => (
                                    <div key={make.slug} className="col-6 col-lg-4">
                                        <div
                                            className={`card h-100 text-center ${selectedMake === make.slug ? 'border-primary' : ''}`}
                                            onClick={() => handleMakeClick(make)}
                                            style={{ cursor: 'pointer', borderRadius: '3px', borderColor: '#767676', padding: '15px 0' }}
                                        >
                                            <small className="fw-semibold text-black">{make.name}</small>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {!searchTerm && !showAll && allMakes.length > popularMakes.length && (
                                <div className="text-center mt-3">
                                    <button
                                        onClick={() => setShowAll(true)}
                                        className="btn btn-outline-primary"
                                    >
                                        Tüm Markaları Göster
                                    </button>
                                </div>
                            )}

                            {!searchTerm && showAll && (
                                <div className="text-center mt-3">
                                    <button
                                        onClick={() => setShowAll(false)}
                                        className="btn btn-outline-secondary btn-sm"
                                    >
                                        Daha Az Göster
                                    </button>
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="text-center py-5">
                            <p className="text-muted mt-2">Sonuç bulunamadı</p>
                        </div>
                    )}
                </div>
                <div className='d-none d-md-block col-md-4'>
                    {isLoggedIn ? (
                        <>
                            <Typography variant="h6" sx={{ py: 1.5, color: 'black', }}>
                                {t('welcome')} <Box component="span" sx={{ fontWeight: 600 }}>{user?.firstName} {user?.lastName}</Box>
                            </Typography>
                            <Divider />
                            <Typography variant="subtitle2" sx={{ py: 1.5, color: 'text.grey' }}>
                                {t('garage_user_text')}
                            </Typography>
                            <Typography variant="subtitle2" sx={{ py: 1.5, color: 'text.grey', fontWeight: '600' }}>
                                {t('garage_user_subtitle')}
                            </Typography>
                            <div className='d-flex'>
                                <Link href={ROUTES.ACCOUNT_VEHICLES} className="btn btn-outline-primary animate-slide-end w-100 text-decoration-none">
                                    {t('my_garage')}
                                </Link>
                            </div>
                        </>
                    ) : (
                        <>
                            <Typography variant="h6" sx={{ py: 1.5, color: 'black', }}>
                                {t('garage_popup_title')}
                            </Typography>
                            <Divider />
                            <Typography variant="subtitle2" sx={{ py: 1.5, color: 'text.grey' }}>
                                {t('garage_text')} <Box component="span" sx={{ fontWeight: 700 }}>{t('garage_text2')}</Box> {t('garage_text3')}
                            </Typography>
                            <Typography variant="subtitle2" sx={{ py: 1.5, color: 'text.grey' }}>
                                {t('garage_login')}
                                <Tooltip
                                    title={
                                        <Typography variant="body2" sx={{ maxWidth: 300 }}>
                                            {t('garage_tooltip')}
                                        </Typography>
                                    }
                                    arrow
                                    placement="right">
                                    <i
                                        className="ri-information-line"
                                        style={{ fontSize: 18, cursor: "pointer", color: "#555", marginLeft: 5 }}>
                                    </i>
                                </Tooltip>
                            </Typography>
                            <div className='d-flex'>
                                <Link href={ROUTES.REGISTER} className="btn btn-dark animate-slide-end w-100 text-decoration-none">
                                    {t('login_to_garage')}
                                </Link>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div >
    );
}