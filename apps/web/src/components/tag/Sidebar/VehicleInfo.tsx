'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Typography, Divider, Accordion, AccordionSummary, AccordionDetails, Box } from '@mui/material';
import { buildTagUrl, buildTireSizeTagFallback } from '@/src/config/routes';
import { useVehicles } from '@/src/hooks/WheelSize/useVehicles';
import { useAuth } from '@/src/hooks/Theme/useAuth';
import wheelSizeService from '@/src/services/wheelSizeService';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { ROUTES } from '@/src/config/routes';

interface VehicleData {
    make: string;
    makeName: string;
    model: string;
    modelName: string;
    year: number;
    modification: string;
    modificationName?: string;
    vehicleImage?: string;
    selectedSize?: string;
    timestamp?: number;
    source?: 'search' | 'garage';
}

interface TireSizeOption {
    display: string;
    width: number;
    aspectRatio: number;
    diameter: number;
    seoUrl: string;
    isSelected: boolean;
    position: 'front' | 'rear' | 'both';
}
interface RimSizeOption {
    display: string;
    diameter: number;
    width: number;
    pcd: string;
    seoUrl: string;
    isSelected: boolean;
    position: 'front' | 'rear' | 'both';
}

interface VehicleInfoProps {
    currentSize: string;
    tagType: string;
}

export default function VehicleInfo({ currentSize, tagType }: VehicleInfoProps) {
    const [mounted, setMounted] = useState(false);
    const [vehicle, setVehicle] = useState<VehicleData | null>(null);
    const [tireSizes, setTireSizes] = useState<TireSizeOption[]>([]);
    const [rimSizes, setRimSizes] = useState<RimSizeOption[]>([]);
    const [loading, setLoading] = useState(false);
    const [isMobile, setIsMobile] = useState(false);

    const { isLoggedIn } = useAuth();
    const { vehicles, loading: vehiclesLoading } = useVehicles();

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        const check = () => setIsMobile(window.innerWidth < 992);
        check();
        window.addEventListener('resize', check);
        return () => window.removeEventListener('resize', check);
    }, []);

    useEffect(() => {
        if (!mounted) return;

        console.log('[VehicleInfo Debug]', {
            mounted,
            isLoggedIn,
            vehiclesLoading,
            vehiclesCount: vehicles?.length,
            vehicles,
            localStorageRaw: typeof window !== 'undefined' ? localStorage.getItem('selectedVehicle') : null
        });

        if (isLoggedIn) {
            if (vehiclesLoading) return;

            const primaryVehicle = vehicles.find(v => v.isPrimary);
            console.log('[VehicleInfo Debug] primaryVehicle:', primaryVehicle);

            if (primaryVehicle) {
                setVehicle({
                    make: primaryVehicle.wheelSizeData?.make || '',
                    makeName: primaryVehicle.wheelSizeData?.makeName || '',
                    model: primaryVehicle.wheelSizeData?.model || '',
                    modelName: primaryVehicle.wheelSizeData?.modelName || '',
                    year: primaryVehicle.wheelSizeData?.year || 0,
                    modification: primaryVehicle.wheelSizeData?.modification || '',
                    modificationName: primaryVehicle.userInputs?.bodyType || '',
                    vehicleImage: primaryVehicle.image?.url || '',
                    source: 'garage'
                });
                return;
            }
        }

        // 2. FALLBACK: Giriş yok veya garaj boş → localStorage (search)
        try {
            const stored = localStorage.getItem('selectedVehicle');

            if (stored) {
                const data = JSON.parse(stored) as VehicleData;
                const isValid = data.timestamp && (Date.now() - data.timestamp) < 2 * 60 * 60 * 1000;

                // source alanı eksikse 'search' varsayılır
                if (isValid && data.make) {
                    setVehicle({ ...data, source: data.source || 'search' });
                    return;
                } else if (data.timestamp && !isValid) {
                    // Sadece süresi gerçekten dolmuşsa temizle
                    localStorage.removeItem('selectedVehicle');
                }
            }
        } catch (error) {
            console.error('[VehicleInfo] localStorage read error:', error);
        }

        // 3. Hiçbiri yoksa araç gösterme
        setVehicle(null);
    }, [mounted, isLoggedIn, vehicles, vehiclesLoading]);

    useEffect(() => {
        if (!vehicle?.make || !vehicle?.model || !vehicle?.year || !vehicle?.modification) {
            return;
        }

        const loadCompatibleSizes = async () => {
            setLoading(true);
            try {
                const vehicleData = await wheelSizeService.getVehicleDetails(
                    vehicle.make,
                    vehicle.model,
                    vehicle.year,
                    vehicle.modification
                );

                // LASTIK EBATLARI
                const groupedTires = wheelSizeService.parseGroupedTires(vehicleData);
                const allTires = [
                    ...groupedTires.both.map(t => ({ ...t, position: 'both' })),
                    ...groupedTires.front.map(t => ({ ...t, position: 'front' })),
                    ...groupedTires.rear.map(t => ({ ...t, position: 'rear' }))
                ];
                const uniqueTireSizes = new Map<string, TireSizeOption>();

                allTires.forEach(tire => {
                    const key = `${tire.width}-${tire.aspectRatio}-${tire.diameter}`;
                    if (!uniqueTireSizes.has(key)) {
                        const seoUrl = buildTireSizeTagFallback(tire.width, tire.aspectRatio, tire.diameter);
                        const sizeKey = `${tire.width}-${tire.aspectRatio}-r${tire.diameter}`;
                        uniqueTireSizes.set(key, {
                            display: tire.display,
                            width: tire.width,
                            aspectRatio: tire.aspectRatio,
                            diameter: tire.diameter,
                            seoUrl,
                            isSelected: currentSize === sizeKey && tagType === 'tire_size',
                            position: tire.position || 'both'
                        });
                    }
                });

                setTireSizes(Array.from(uniqueTireSizes.values()));

                // JANT EBATLARI
                const groupedRims = parseGroupedRims(vehicleData);
                const allRims = [
                    ...groupedRims.both.map(r => ({ ...r, position: 'both' })),
                    ...groupedRims.front.map(r => ({ ...r, position: 'front' })),
                    ...groupedRims.rear.map(r => ({ ...r, position: 'rear' }))
                ];
                const uniqueRimSizes = new Map<string, RimSizeOption>();

                allRims.forEach(rim => {
                    const key = `${rim.pcd}-${rim.diameter}-${rim.width}-${rim.offset}`;
                    if (!uniqueRimSizes.has(key)) {
                        const urlPcd = rim.pcd.toLowerCase().replace('x', '-').replace('.', '');
                        const seoUrl = `${urlPcd}-jant-fiyatlari`;
                        uniqueRimSizes.set(key, {
                            display: `${rim.width}x${rim.diameter} ET${rim.offset}`,
                            diameter: rim.diameter,
                            width: rim.width,
                            pcd: rim.pcd,
                            seoUrl,
                            isSelected: currentSize === `${urlPcd}` && tagType === 'rim_pcd',
                            position: rim.position || 'both'
                        });
                    }
                });

                setRimSizes(Array.from(uniqueRimSizes.values()));

            } catch (error) {
                console.error('[VehicleInfo] Load sizes error:', error);
            } finally {
                setLoading(false);
            }
        };

        loadCompatibleSizes();
    }, [vehicle, currentSize, tagType]);
    function parseGroupedRims(vehicleData: any[]): any {
        const front: any[] = [];
        const rear: any[] = [];
        const both: any[] = [];
        const seenIds = new Set<string>();

        vehicleData.forEach(vehicle => {
            if (!vehicle.wheels || !vehicle.technical) return;

            const pcdData = vehicle.technical.stud_holes && vehicle.technical.pcd
                ? { bolts: vehicle.technical.stud_holes, diameter: vehicle.technical.pcd }
                : null;
            const pcdString = pcdData ? `${pcdData.bolts}X${pcdData.diameter}` : '';
            const centerBore = vehicle.technical.centre_bore ? parseFloat(vehicle.technical.centre_bore) : 0;

            vehicle.wheels.forEach((wheel: any, idx: number) => {
                const frontRim = wheel.front;
                const rearRim = wheel.rear;

                if (frontRim?.rim_diameter && frontRim?.rim_width && frontRim?.rim_offset != null) {
                    const hasRear = rearRim?.rim_diameter && rearRim?.rim_width && rearRim?.rim_offset != null;

                    if (!hasRear) {
                        const id = `both-${frontRim.rim_diameter}-${frontRim.rim_width}-${frontRim.rim_offset}-${idx}`;
                        if (!seenIds.has(id)) {
                            seenIds.add(id);
                            both.push({
                                id,
                                diameter: frontRim.rim_diameter,
                                width: frontRim.rim_width,
                                pcd: pcdString,
                                offset: frontRim.rim_offset,
                                centerBore
                            });
                        }
                    } else {
                        const frontKey = `${frontRim.rim_diameter}-${frontRim.rim_width}-${frontRim.rim_offset}`;
                        const rearKey = `${rearRim.rim_diameter}-${rearRim.rim_width}-${rearRim.rim_offset}`;

                        if (frontKey === rearKey) {
                            const id = `both-${frontKey}-${idx}`;
                            if (!seenIds.has(id)) {
                                seenIds.add(id);
                                both.push({
                                    id,
                                    diameter: frontRim.rim_diameter,
                                    width: frontRim.rim_width,
                                    pcd: pcdString,
                                    offset: frontRim.rim_offset,
                                    centerBore
                                });
                            }
                        } else {
                            const frontId = `front-${frontKey}-${idx}`;
                            if (!seenIds.has(frontId)) {
                                seenIds.add(frontId);
                                front.push({
                                    id: frontId,
                                    diameter: frontRim.rim_diameter,
                                    width: frontRim.rim_width,
                                    pcd: pcdString,
                                    offset: frontRim.rim_offset,
                                    centerBore
                                });
                            }

                            const rearId = `rear-${rearKey}-${idx}`;
                            if (!seenIds.has(rearId)) {
                                seenIds.add(rearId);
                                rear.push({
                                    id: rearId,
                                    diameter: rearRim.rim_diameter,
                                    width: rearRim.rim_width,
                                    pcd: pcdString,
                                    offset: rearRim.rim_offset,
                                    centerBore
                                });
                            }
                        }
                    }
                }
            });
        });

        return { front, rear, both };
    }

    const handleOpenModal = () => {
        window.dispatchEvent(new CustomEvent('openTireSearchModal'));
    };

    const handleClearVehicle = () => {
        localStorage.removeItem('selectedVehicle');
        setVehicle(null);
        setTireSizes([]);
    };

    if (!mounted) {
        return null;
    }

    if (!vehicle) {
        return null;
    }

    // Araç Görseli 
    const vehicleInfoContent = (
        <>
            <div className="d-flex justify-content-between align-items-center">
                <Typography className='d-none d-md-flex' variant="subtitle1" sx={{ fontWeight: 600, color: 'black' }}>
                    {vehicle.source === 'garage' ? 'Garajımdaki Aracım' : 'Aracınız'}
                </Typography>
                {vehicle.source === 'search' && (
                    <button
                        onClick={handleClearVehicle}
                        className="btn btn-sm btn-link text-muted p-0"
                        title="Araç seçimini kaldır"
                    >
                        <i className="ri-close-line"></i>
                    </button>
                )}
            </div>
            <Divider sx={{ my: 1.5 }} />

            {/* Araç Görseli */}
            <div className="mb-3">
                {vehicle.vehicleImage ? (
                    <img
                        src={vehicle.vehicleImage}
                        alt={`${vehicle.makeName} ${vehicle.modelName}`}
                        className="img-fluid d-none d-md-flex"
                        style={{ maxHeight: '180px', objectFit: 'contain' }}
                    />
                ) : (
                    <i className="ri-car-line" style={{ fontSize: '1.4rem', color: '#dee2e6' }}></i>
                )}
            </div>
            <div>
                <strong>{vehicle.makeName} {vehicle.modelName} {vehicle.year}</strong>
                {vehicle.source === 'garage' && (
                    <span className="badge bg-success ms-2" style={{ fontSize: '10px' }}>Garajım</span>
                )}
                <button
                    onClick={handleOpenModal}
                    className="d-none d-md-flex btn p-0 w-100 text-start justify-content-start"
                    style={{ fontSize: '12px', color: 'var(--cz-primary)' }}
                >
                    Aracı Değiştir <i className="ri-arrow-right-s-line"></i>
                </button>

                <Link
                    href={ROUTES.ACCOUNT_VEHICLES}
                    className="d-flex d-md-none btn p-0 w-100 text-start justify-content-start"
                    style={{ fontSize: '12px', color: 'var(--cz-primary)' }}
                >
                    Garaja Git <i className="ri-arrow-right-s-line"></i>
                </Link>
            </div>
        </>
    );

    return (
        <div className="vehicle-info-sidebar">
            {/* ===== ARAÇ GÖRSELİ */}
            {isMobile ? (
                <Accordion
                    defaultExpanded={false}
                    className='mb-3 border'
                    sx={{ boxShadow: 'none', borderColor: 'black', borderRadius: '8px !important', '&:before': { display: 'none' } }}
                >
                    <AccordionSummary
                        expandIcon={<ExpandMoreIcon />}
                        sx={{
                            minHeight: 'unset',
                            '& .MuiAccordionSummary-content': { margin: '10px 0' },
                            '&.Mui-expanded': { minHeight: 'unset' },
                            '&.Mui-expanded .MuiAccordionSummary-content': { margin: '10px 0' },
                        }}
                    >
                        <Typography className='fw-semibold text-black' variant="subtitle1">
                            Garajım
                        </Typography>
                    </AccordionSummary>
                    <AccordionDetails sx={{ pt: 0 }}>
                        {vehicleInfoContent}
                    </AccordionDetails>
                </Accordion>
            ) : (
                <div>{vehicleInfoContent}</div>
            )}
            {!isMobile && (
                <>
                    <Divider sx={{ my: 1.5 }} />

                    {loading ? (
                        <div className="text-center py-3">
                            <div className="spinner-border spinner-border-sm text-primary" role="status">
                                <span className="visually-hidden">Yükleniyor...</span>
                            </div>
                        </div>
                    ) : (
                        <>
                            {/* LASTİK ETİKETİ  */}
                            {tagType === 'tire_size' && (
                                <>
                                    {/* Ön/Arka Lastik */}
                                    {tireSizes.filter(s => s.position === 'both').length > 0 && (
                                        <>
                                            <Accordion defaultExpanded sx={{ boxShadow: "none", border: "none", "&:before": { display: "none" } }}>
                                                <AccordionSummary
                                                    expandIcon={<ExpandMoreIcon />}
                                                    sx={{
                                                        minHeight: 'unset',
                                                        pl: 0,
                                                        '& .MuiAccordionSummary-content': { margin: '10px 0' },
                                                        '&.Mui-expanded': { minHeight: 'unset' },
                                                        '&.Mui-expanded .MuiAccordionSummary-content': { margin: '10px 0' }
                                                    }}
                                                >
                                                    <Typography variant="subtitle1" sx={{ fontWeight: 600, color: 'black' }}>
                                                        {vehicle.makeName} {vehicle.modelName} Ön/Arka Lastik
                                                    </Typography>
                                                </AccordionSummary>
                                                <AccordionDetails sx={{ pt: 1, pb: 0, pl: 0 }}>
                                                    {tireSizes.filter(s => s.position === 'both').map((size, idx) => (
                                                        <div key={idx} className="input-group mb-2">
                                                            {size.isSelected ? (
                                                                <div className="d-flex align-items-center">
                                                                    <input type="radio" checked={true} readOnly />
                                                                    <label className="input-group-label ms-2" style={{ fontWeight: 600, color: 'var(--cz-primary)', fontSize: '13px' }}>
                                                                        {size.display}
                                                                    </label>
                                                                </div>
                                                            ) : (
                                                                <Link href={buildTagUrl(size.seoUrl)} className="d-flex align-items-center text-decoration-none text-dark">
                                                                    <input type="radio" checked={false} readOnly />
                                                                    <span className="input-group-label ms-2" style={{ fontSize: '13px' }}>{size.display}</span>
                                                                </Link>
                                                            )}
                                                        </div>
                                                    ))}
                                                </AccordionDetails>
                                            </Accordion>
                                            <Divider sx={{ my: 1 }} />
                                        </>
                                    )}

                                    {/* Ön Lastik */}
                                    {tireSizes.filter(s => s.position === 'front').length > 0 && (
                                        <>
                                            <Accordion defaultExpanded sx={{ boxShadow: "none", border: "none", "&:before": { display: "none" } }}>
                                                <AccordionSummary
                                                    expandIcon={<ExpandMoreIcon />}
                                                    sx={{
                                                        minHeight: 'unset',
                                                        pl: 0,
                                                        '& .MuiAccordionSummary-content': { margin: '10px 0' },
                                                        '&.Mui-expanded': { minHeight: 'unset' },
                                                        '&.Mui-expanded .MuiAccordionSummary-content': { margin: '10px 0' }
                                                    }}
                                                >
                                                    <Typography variant="subtitle1" sx={{ fontWeight: 600, color: 'black' }}>
                                                        {vehicle.makeName} {vehicle.modelName} Ön Lastik
                                                    </Typography>
                                                </AccordionSummary>
                                                <AccordionDetails sx={{ pt: 1, pb: 0, pl: 0 }}>
                                                    {tireSizes.filter(s => s.position === 'front').map((size, idx) => (
                                                        <div key={idx} className="input-group mb-2">
                                                            {size.isSelected ? (
                                                                <div className="d-flex align-items-center">
                                                                    <input type="radio" checked={true} readOnly />
                                                                    <label className="input-group-label ms-2" style={{ fontWeight: 600, color: 'var(--cz-primary)', fontSize: '13px' }}>
                                                                        {size.display}
                                                                    </label>
                                                                </div>
                                                            ) : (
                                                                <Link href={buildTagUrl(size.seoUrl)} className="d-flex align-items-center text-decoration-none text-dark">
                                                                    <input type="radio" checked={false} readOnly />
                                                                    <span className="input-group-label ms-2" style={{ fontSize: '13px' }}>{size.display}</span>
                                                                </Link>
                                                            )}
                                                        </div>
                                                    ))}
                                                </AccordionDetails>
                                            </Accordion>
                                            <Divider sx={{ my: 1 }} />
                                        </>
                                    )}

                                    {/* Arka Lastik */}
                                    {tireSizes.filter(s => s.position === 'rear').length > 0 && (
                                        <>
                                            <Accordion defaultExpanded sx={{ boxShadow: "none", border: "none", "&:before": { display: "none" } }}>
                                                <AccordionSummary
                                                    expandIcon={<ExpandMoreIcon />}
                                                    sx={{
                                                        minHeight: 'unset',
                                                        pl: 0,
                                                        '& .MuiAccordionSummary-content': { margin: '10px 0' },
                                                        '&.Mui-expanded': { minHeight: 'unset' },
                                                        '&.Mui-expanded .MuiAccordionSummary-content': { margin: '10px 0' }
                                                    }}
                                                >
                                                    <Typography variant="subtitle1" sx={{ fontWeight: 600, color: 'black' }}>
                                                        {vehicle.makeName} {vehicle.modelName} Arka Lastik
                                                    </Typography>
                                                </AccordionSummary>
                                                <AccordionDetails sx={{ pt: 1, pb: 0, pl: 0 }}>
                                                    {tireSizes.filter(s => s.position === 'rear').map((size, idx) => (
                                                        <div key={idx} className="input-group mb-2">
                                                            {size.isSelected ? (
                                                                <div className="d-flex align-items-center">
                                                                    <input type="radio" checked={true} readOnly />
                                                                    <label className="input-group-label ms-2" style={{ fontWeight: 600, color: 'var(--cz-primary)', fontSize: '13px' }}>
                                                                        {size.display}
                                                                    </label>
                                                                </div>
                                                            ) : (
                                                                <Link href={buildTagUrl(size.seoUrl)} className="d-flex align-items-center text-decoration-none text-dark">
                                                                    <input type="radio" checked={false} readOnly />
                                                                    <span className="input-group-label ms-2" style={{ fontSize: '13px' }}>{size.display}</span>
                                                                </Link>
                                                            )}
                                                        </div>
                                                    ))}
                                                </AccordionDetails>
                                            </Accordion>
                                        </>
                                    )}

                                    {tireSizes.length === 0 && (
                                        <p className="text-muted small mb-0">Lastik bilgisi yükleniyor...</p>
                                    )}
                                </>
                            )}

                            {/* JANT ETİKETİ  */}
                            {tagType === 'rim_pcd' && (
                                <>
                                    {/* Ön/Arka Jant */}
                                    {rimSizes.filter(s => s.position === 'both').length > 0 && (
                                        <>
                                            <Accordion defaultExpanded sx={{ boxShadow: "none", border: "none", "&:before": { display: "none" } }}>
                                                <AccordionSummary
                                                    expandIcon={<ExpandMoreIcon />}
                                                    sx={{
                                                        minHeight: 'unset',
                                                        pl: 0,
                                                        '& .MuiAccordionSummary-content': { margin: '10px 0' },
                                                        '&.Mui-expanded': { minHeight: 'unset' },
                                                        '&.Mui-expanded .MuiAccordionSummary-content': { margin: '10px 0' }
                                                    }}
                                                >
                                                    <Typography variant="subtitle1" sx={{ fontWeight: 600, color: 'black' }}>
                                                        {vehicle.makeName} {vehicle.modelName} Ön/Arka Jant
                                                    </Typography>
                                                </AccordionSummary>
                                                <AccordionDetails sx={{ pt: 1, pb: 0, pl: 0 }}>
                                                    {rimSizes.filter(s => s.position === 'both').map((size, idx) => (
                                                        <div key={idx} className="input-group mb-2">
                                                            {size.isSelected ? (
                                                                <div className="d-flex align-items-center">
                                                                    <input type="radio" checked={true} readOnly />
                                                                    <label className="input-group-label ms-2" style={{ fontWeight: 600, color: 'var(--cz-primary)', fontSize: '13px' }}>
                                                                        {size.pcd} ({size.display})
                                                                    </label>
                                                                </div>
                                                            ) : (
                                                                <Link href={buildTagUrl(size.seoUrl)} className="d-flex align-items-center text-decoration-none text-dark">
                                                                    <input type="radio" checked={false} readOnly />
                                                                    <span className="input-group-label ms-2" style={{ fontSize: '13px' }}>{size.pcd} ({size.display})</span>
                                                                </Link>
                                                            )}
                                                        </div>
                                                    ))}
                                                </AccordionDetails>
                                            </Accordion>
                                            <Divider sx={{ my: 1 }} />
                                        </>
                                    )}

                                    {/* Ön Jant */}
                                    {rimSizes.filter(s => s.position === 'front').length > 0 && (
                                        <>
                                            <Accordion defaultExpanded sx={{ boxShadow: "none", border: "none", "&:before": { display: "none" } }}>
                                                <AccordionSummary
                                                    expandIcon={<ExpandMoreIcon />}
                                                    sx={{
                                                        minHeight: 'unset',
                                                        pl: 0,
                                                        '& .MuiAccordionSummary-content': { margin: '10px 0' },
                                                        '&.Mui-expanded': { minHeight: 'unset' },
                                                        '&.Mui-expanded .MuiAccordionSummary-content': { margin: '10px 0' }
                                                    }}
                                                >
                                                    <Typography variant="subtitle1" sx={{ fontWeight: 600, color: 'black' }}>
                                                        {vehicle.makeName} {vehicle.modelName} Ön Jant
                                                    </Typography>
                                                </AccordionSummary>
                                                <AccordionDetails sx={{ pt: 1, pb: 0, pl: 0 }}>
                                                    {rimSizes.filter(s => s.position === 'front').map((size, idx) => (
                                                        <div key={idx} className="input-group mb-2">
                                                            {size.isSelected ? (
                                                                <div className="d-flex align-items-center">
                                                                    <input type="radio" checked={true} readOnly />
                                                                    <label className="input-group-label ms-2" style={{ fontWeight: 600, color: 'var(--cz-primary)', fontSize: '13px' }}>
                                                                        {size.pcd} ({size.display})
                                                                    </label>
                                                                </div>
                                                            ) : (
                                                                <Link href={buildTagUrl(size.seoUrl)} className="d-flex align-items-center text-decoration-none text-dark">
                                                                    <input type="radio" checked={false} readOnly />
                                                                    <span className="input-group-label ms-2" style={{ fontSize: '13px' }}>{size.pcd} ({size.display})</span>
                                                                </Link>
                                                            )}
                                                        </div>
                                                    ))}
                                                </AccordionDetails>
                                            </Accordion>
                                            <Divider sx={{ my: 1 }} />
                                        </>
                                    )}

                                    {/* Arka Jant */}
                                    {rimSizes.filter(s => s.position === 'rear').length > 0 && (
                                        <>
                                            <Accordion defaultExpanded sx={{ boxShadow: "none", border: "none", "&:before": { display: "none" } }}>
                                                <AccordionSummary
                                                    expandIcon={<ExpandMoreIcon />}
                                                    sx={{
                                                        minHeight: 'unset',
                                                        pl: 0,
                                                        '& .MuiAccordionSummary-content': { margin: '10px 0' },
                                                        '&.Mui-expanded': { minHeight: 'unset' },
                                                        '&.Mui-expanded .MuiAccordionSummary-content': { margin: '10px 0' }
                                                    }}
                                                >
                                                    <Typography variant="subtitle1" sx={{ fontWeight: 600, color: 'black' }}>
                                                        {vehicle.makeName} {vehicle.modelName} Arka Jant
                                                    </Typography>
                                                </AccordionSummary>
                                                <AccordionDetails sx={{ pt: 1, pb: 0, pl: 0 }}>
                                                    {rimSizes.filter(s => s.position === 'rear').map((size, idx) => (
                                                        <div key={idx} className="input-group mb-2">
                                                            {size.isSelected ? (
                                                                <div className="d-flex align-items-center">
                                                                    <input type="radio" checked={true} readOnly />
                                                                    <label className="input-group-label ms-2" style={{ fontWeight: 600, color: 'var(--cz-primary)', fontSize: '13px' }}>
                                                                        {size.pcd} ({size.display})
                                                                    </label>
                                                                </div>
                                                            ) : (
                                                                <Link href={buildTagUrl(size.seoUrl)} className="d-flex align-items-center text-decoration-none text-dark">
                                                                    <input type="radio" checked={false} readOnly />
                                                                    <span className="input-group-label ms-2" style={{ fontSize: '13px' }}>{size.pcd} ({size.display})</span>
                                                                </Link>
                                                            )}
                                                        </div>
                                                    ))}
                                                </AccordionDetails>
                                            </Accordion>
                                        </>
                                    )}

                                    {rimSizes.length === 0 && (
                                        <p className="text-muted small mb-0">Jant bilgisi yükleniyor...</p>
                                    )}
                                </>
                            )}
                        </>
                    )}
                </>
            )}
        </div>
    );
}