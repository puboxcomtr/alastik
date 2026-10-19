'use client';

import React, { useState, useEffect } from 'react';
import { Modal, Box } from '@mui/material';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'react-toastify';
import { useAuth } from '@/src/hooks/Theme/useAuth';
import { addressService } from '@/src/services/addressService';
import { locationService, City, District, Neighborhood } from '@/src/services/locationService';
import { Address } from '@/src/types/adress';
import { formatPhoneNumber, parsePhoneNumber, displayPhoneNumber } from '@/src/hooks/helper';

const addressSchema = z.object({
    addressName: z.string().min(1, 'Adres adı zorunludur'),
    invoiceType: z.enum(['individual', 'corporate']),
    fullName: z.string().optional(),
    tcNo: z.string().optional(),
    companyName: z.string().optional(),
    taxOffice: z.string().optional(),
    taxNo: z.string().optional(),
    authorizedPerson: z.string().optional(),
    email: z.string().optional(),
    phone: z.string().optional(),
    cityId: z.string().min(1, 'İl seçiniz'),
    cityName: z.string(),
    districtId: z.string().min(1, 'İlçe seçiniz'),
    districtName: z.string(),
    neighborhoodId: z.string().min(1, 'Mahalle seçiniz'),
    neighborhoodName: z.string(),
    street: z.string().min(1, 'Sokak/Cadde zorunludur'),
    buildingNo: z.string().min(1, 'Bina No zorunludur'),
    floor: z.string().optional(),
    apartmentNo: z.string().optional(),
    addressNote: z.string().optional(),
    isDefault: z.boolean().optional()
}).refine((data) => {
    if (data.invoiceType === 'individual') {
        return !!data.fullName;
    }
    return true;
}, { message: 'İsim Soyisim zorunludur', path: ['fullName'] })
    .superRefine((data, ctx) => {
        if (data.invoiceType === 'individual') {
            if (!data.fullName) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: 'İsim Soyisim zorunludur',
                    path: ['fullName']
                });
            }
        }

        if (data.invoiceType === 'corporate') {
            if (!data.companyName) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: 'Ticari Ünvan zorunludur',
                    path: ['companyName']
                });
            }
            if (!data.taxOffice) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: 'Vergi Dairesi zorunludur',
                    path: ['taxOffice']
                });
            }
            if (!data.taxNo) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: 'Vergi No zorunludur',
                    path: ['taxNo']
                });
            }
        }
    });

const shippingSchema = z.object({
    differentShipping: z.boolean().optional(),
    shippingFullName: z.string().optional(),
    shippingPhone: z.string().optional(),
    shippingCityId: z.string().optional(),
    shippingCityName: z.string().optional(),
    shippingDistrictId: z.string().optional(),
    shippingDistrictName: z.string().optional(),
    shippingNeighborhoodId: z.string().optional(),
    shippingNeighborhoodName: z.string().optional(),
    shippingStreet: z.string().optional(),
    shippingBuildingNo: z.string().optional(),
    shippingFloor: z.string().optional(),
    shippingApartmentNo: z.string().optional(),
    shippingAddressNote: z.string().optional()
}).superRefine((data, ctx) => {
    if (!data.differentShipping) return;

    if (!data.shippingFullName) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Teslim edilecek kişi zorunludur',
            path: ['shippingFullName']
        });
    }
    if (!data.shippingPhone) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Cep telefonu zorunludur',
            path: ['shippingPhone']
        });
    }
    if (!data.shippingCityId) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'İl seçiniz',
            path: ['shippingCityId']
        });
    }
    if (!data.shippingDistrictId) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'İlçe seçiniz',
            path: ['shippingDistrictId']
        });
    }
    if (!data.shippingNeighborhoodId) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Mahalle seçiniz',
            path: ['shippingNeighborhoodId']
        });
    }
    if (!data.shippingStreet) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Sokak/Cadde zorunludur',
            path: ['shippingStreet']
        });
    }
    if (!data.shippingBuildingNo) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Bina No zorunludur',
            path: ['shippingBuildingNo']
        });
    }
});

const combinedSchema = addressSchema.and(shippingSchema);

type AddressFormData = z.infer<typeof combinedSchema>;

interface AddressModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    address?: Address | null;
}

const modalStyle = {
    position: 'absolute' as const,
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: '90%',
    maxWidth: 700,
    maxHeight: '90vh',
    bgcolor: 'background.paper',
    borderRadius: 2,
    boxShadow: 24,
    overflow: 'auto'
};

const getDefaultValues = (address?: Address | null, shippingAddress?: Address | null): AddressFormData => ({
    addressName: address?.addressName || '',
    invoiceType: address?.invoiceType || 'individual',
    fullName: address?.fullName || '',
    tcNo: address?.tcNo || '',
    companyName: address?.companyName || '',
    taxOffice: address?.taxOffice || '',
    taxNo: address?.taxNo || '',
    authorizedPerson: address?.authorizedPerson || '',
    email: address?.email || '',
    phone: address?.phone || '',
    cityId: address?.cityId || '',
    cityName: address?.cityName || '',
    districtId: address?.districtId || '',
    districtName: address?.districtName || '',
    neighborhoodId: address?.neighborhoodId || '',
    neighborhoodName: address?.neighborhoodName || '',
    street: address?.street || '',
    buildingNo: address?.buildingNo || '',
    floor: address?.floor || '',
    apartmentNo: address?.apartmentNo || '',
    addressNote: address?.addressNote || '',
    isDefault: address?.isDefault ?? true,
    differentShipping: !!shippingAddress,
    shippingFullName: shippingAddress?.fullName || '',
    shippingPhone: shippingAddress?.phone || '',
    shippingCityId: shippingAddress?.cityId || '',
    shippingCityName: shippingAddress?.cityName || '',
    shippingDistrictId: shippingAddress?.districtId || '',
    shippingDistrictName: shippingAddress?.districtName || '',
    shippingNeighborhoodId: shippingAddress?.neighborhoodId || '',
    shippingNeighborhoodName: shippingAddress?.neighborhoodName || '',
    shippingStreet: shippingAddress?.street || '',
    shippingBuildingNo: shippingAddress?.buildingNo || '',
    shippingFloor: shippingAddress?.floor || '',
    shippingApartmentNo: shippingAddress?.apartmentNo || '',
    shippingAddressNote: shippingAddress?.addressNote || ''
});

export default function AddressModal({ isOpen, onClose, onSuccess, address }: AddressModalProps) {
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [cities, setCities] = useState<City[]>([]);
    const [districts, setDistricts] = useState<District[]>([]);
    const [neighborhoods, setNeighborhoods] = useState<Neighborhood[]>([]);
    const [locationLoading, setLocationLoading] = useState({ cities: true, districts: false, neighborhoods: false });
    const [shippingDistricts, setShippingDistricts] = useState<District[]>([]);
    const [shippingNeighborhoods, setShippingNeighborhoods] = useState<Neighborhood[]>([]);
    const [shippingLocationLoading, setShippingLocationLoading] = useState({ districts: false, neighborhoods: false });
    const [initialLoadDone, setInitialLoadDone] = useState(false);
    const [shippingInitialLoadDone, setShippingInitialLoadDone] = useState(false);
    const [linkedShippingAddress, setLinkedShippingAddress] = useState<Address | null>(null);

    const isEditMode = !!address;

    const {
        register,
        watch,
        setValue,
        reset,
        handleSubmit,
        formState: { errors }
    } = useForm<AddressFormData>({
        resolver: zodResolver(combinedSchema),
        defaultValues: getDefaultValues(address),
        mode: 'onChange'
    });

    const invoiceType = watch('invoiceType');
    const cityId = watch('cityId');
    const districtId = watch('districtId');
    const differentShipping = watch('differentShipping');
    const shippingCityId = watch('shippingCityId');
    const shippingDistrictId = watch('shippingDistrictId');
    const watchAll = watch();

    useEffect(() => {
        if (isOpen) {
            setInitialLoadDone(false);
            setShippingInitialLoadDone(false);
            setLinkedShippingAddress(null);
            loadCities();

            if (isEditMode && address?.linkedShippingAddressId) {
                loadLinkedShippingAddress(address.linkedShippingAddressId);
            } else {
                reset(getDefaultValues(address, null));
            }
        }
    }, [isOpen, address]);

    useEffect(() => {
        if (isOpen && address) {
            reset(getDefaultValues(address, linkedShippingAddress));
        }
    }, [linkedShippingAddress]);

    useEffect(() => {
        const loadEditModeLocations = async () => {
            if (isOpen && isEditMode && cities.length > 0 && !initialLoadDone) {
                if (address?.cityId) {
                    await loadDistricts(address.cityId, true);
                }
            }
        };
        loadEditModeLocations();
    }, [isOpen, isEditMode, cities, address, initialLoadDone]);

    useEffect(() => {
        const loadShippingEditModeLocations = async () => {
            if (isOpen && linkedShippingAddress && cities.length > 0 && !shippingInitialLoadDone) {
                if (linkedShippingAddress.cityId) {
                    await loadShippingDistricts(linkedShippingAddress.cityId, true);
                }
            }
        };
        loadShippingEditModeLocations();
    }, [isOpen, linkedShippingAddress, cities, shippingInitialLoadDone]);

    useEffect(() => {
        if (cityId && (initialLoadDone || !isEditMode)) {
            loadDistricts(cityId);
        }
    }, [cityId]);

    useEffect(() => {
        if (districtId && (initialLoadDone || !isEditMode)) {
            loadNeighborhoods(districtId);
        }
    }, [districtId]);

    useEffect(() => {
        if (shippingCityId && (shippingInitialLoadDone || !isEditMode || !linkedShippingAddress)) {
            loadShippingDistricts(shippingCityId);
        }
    }, [shippingCityId]);

    useEffect(() => {
        if (shippingDistrictId && (shippingInitialLoadDone || !isEditMode || !linkedShippingAddress)) {
            loadShippingNeighborhoods(shippingDistrictId);
        }
    }, [shippingDistrictId]);

    const loadLinkedShippingAddress = async (shippingId: string) => {
        try {
            const shippingAddr = await addressService.getAddress(shippingId);
            if (shippingAddr && shippingAddr.isActive) {
                setLinkedShippingAddress(shippingAddr);
            }
        } catch (error) {
            console.error('Teslimat adresi yüklenemedi:', error);
        }
    };

    const loadCities = async () => {
        setLocationLoading(prev => ({ ...prev, cities: true }));
        const result = await locationService.getCities();
        setCities(result);
        setLocationLoading(prev => ({ ...prev, cities: false }));
    };

    const loadDistricts = async (cityId: string, isInitialLoad = false) => {
        setLocationLoading(prev => ({ ...prev, districts: true }));
        if (!isInitialLoad) {
            setDistricts([]);
            setNeighborhoods([]);
        }
        const result = await locationService.getDistricts(cityId);
        setDistricts(result);
        setLocationLoading(prev => ({ ...prev, districts: false }));

        if (isInitialLoad && address?.districtId) {
            await loadNeighborhoods(address.districtId, true);
        }
    };

    const loadNeighborhoods = async (districtId: string, isInitialLoad = false) => {
        setLocationLoading(prev => ({ ...prev, neighborhoods: true }));
        if (!isInitialLoad) {
            setNeighborhoods([]);
        }
        const result = await locationService.getNeighborhoods(districtId);
        setNeighborhoods(result);
        setLocationLoading(prev => ({ ...prev, neighborhoods: false }));

        if (isInitialLoad) {
            setInitialLoadDone(true);
        }
    };

    const handleCityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const city = cities.find(c => c.cityId === e.target.value);
        setValue('cityId', e.target.value);
        setValue('cityName', city?.cityName || '');
        setValue('districtId', '');
        setValue('districtName', '');
        setValue('neighborhoodId', '');
        setValue('neighborhoodName', '');
    };

    const handleDistrictChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const district = districts.find(d => d.districtId === e.target.value);
        setValue('districtId', e.target.value);
        setValue('districtName', district?.districtName || '');
        setValue('neighborhoodId', '');
        setValue('neighborhoodName', '');
    };

    const handleNeighborhoodChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const neighborhood = neighborhoods.find(n => n.neighborhoodId === e.target.value);
        setValue('neighborhoodId', e.target.value);
        setValue('neighborhoodName', neighborhood?.neighborhoodName || '');
    };

    const loadShippingDistricts = async (cityId: string, isInitialLoad = false) => {
        console.log('loadShippingDistricts called:', cityId);
        setShippingLocationLoading(prev => ({ ...prev, districts: true }));
        if (!isInitialLoad) {
            setShippingDistricts([]);
            setShippingNeighborhoods([]);
        }
        const result = await locationService.getDistricts(cityId);
        setShippingDistricts(result);
        setShippingLocationLoading(prev => ({ ...prev, districts: false }));

        if (isInitialLoad && linkedShippingAddress?.districtId) {
            await loadShippingNeighborhoods(linkedShippingAddress.districtId, true);
        }
    };

    const loadShippingNeighborhoods = async (districtId: string, isInitialLoad = false) => {
        setShippingLocationLoading(prev => ({ ...prev, neighborhoods: true }));
        if (!isInitialLoad) {
            setShippingNeighborhoods([]);
        }
        const result = await locationService.getNeighborhoods(districtId);
        setShippingNeighborhoods(result);
        setShippingLocationLoading(prev => ({ ...prev, neighborhoods: false }));

        if (isInitialLoad) {
            setShippingInitialLoadDone(true);
        }
    };

    const handleShippingCityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        console.log('Shipping city changed:', e.target.value);
        const city = cities.find(c => c.cityId === e.target.value);
        setValue('shippingCityId', e.target.value);
        setValue('shippingCityName', city?.cityName || '');
        setValue('shippingDistrictId', '');
        setValue('shippingDistrictName', '');
        setValue('shippingNeighborhoodId', '');
        setValue('shippingNeighborhoodName', '');
    };

    const handleShippingDistrictChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const district = shippingDistricts.find(d => d.districtId === e.target.value);
        setValue('shippingDistrictId', e.target.value);
        setValue('shippingDistrictName', district?.districtName || '');
        setValue('shippingNeighborhoodId', '');
        setValue('shippingNeighborhoodName', '');
    };

    const handleShippingNeighborhoodChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const neighborhood = shippingNeighborhoods.find(n => n.neighborhoodId === e.target.value);
        setValue('shippingNeighborhoodId', e.target.value);
        setValue('shippingNeighborhoodName', neighborhood?.neighborhoodName || '');
    };

    const onSubmit = async (data: AddressFormData) => {
        if (!user?.id) return;

        setLoading(true);
        try {
            const billingData = {
                addressName: data.addressName,
                invoiceType: data.invoiceType,
                fullName: data.fullName,
                tcNo: data.tcNo,
                companyName: data.companyName,
                taxOffice: data.taxOffice,
                taxNo: data.taxNo,
                authorizedPerson: data.authorizedPerson,
                email: user?.email || '',
                phone: user?.phone || '',
                cityId: data.cityId,
                cityName: data.cityName,
                districtId: data.districtId,
                districtName: data.districtName,
                neighborhoodId: data.neighborhoodId,
                neighborhoodName: data.neighborhoodName,
                street: data.street,
                buildingNo: data.buildingNo,
                floor: data.floor,
                apartmentNo: data.apartmentNo,
                addressNote: data.addressNote,
                isDefault: data.isDefault,
                isBilling: true,
                isShipping: !data.differentShipping,
                isActive: true
            };

            const shippingData = {
                addressName: `${data.addressName} - Teslimat`,
                invoiceType: 'individual' as const,
                fullName: data.shippingFullName,
                email: user?.email || '',
                phone: data.shippingPhone,
                cityId: data.shippingCityId,
                cityName: data.shippingCityName,
                districtId: data.shippingDistrictId,
                districtName: data.shippingDistrictName,
                neighborhoodId: data.shippingNeighborhoodId,
                neighborhoodName: data.shippingNeighborhoodName,
                street: data.shippingStreet,
                buildingNo: data.shippingBuildingNo,
                floor: data.shippingFloor,
                apartmentNo: data.shippingApartmentNo,
                addressNote: data.shippingAddressNote,
                isDefault: false,
                isBilling: false,
                isShipping: true,
                isActive: true
            };

            if (isEditMode && address?._id) {

                const billingResult = await addressService.updateAddress(address._id, billingData);

                if (data.differentShipping) {
                    if (linkedShippingAddress?._id) {
                        await addressService.updateAddress(linkedShippingAddress._id, shippingData);
                    } else {
                        const newShipping = await addressService.createAddress(user.id, shippingData);
                        if (newShipping?._id) {
                            await addressService.updateAddress(address._id, {
                                ...billingData,
                                linkedShippingAddressId: newShipping._id
                            });
                        }
                    }
                } else {
                    if (linkedShippingAddress?._id) {
                        await addressService.updateAddress(linkedShippingAddress._id, {
                            isActive: false
                        });
                        await addressService.updateAddress(address._id, {
                            ...billingData,
                            linkedShippingAddressId: null
                        });
                    }
                }

                if (billingResult) {
                    toast.success('Adres başarıyla güncellendi');
                } else {
                    toast.error('Adres güncellenemedi');
                }

            } else {

                const billingResult = await addressService.createAddress(user.id, billingData);

                if (billingResult && data.differentShipping) {
                    const shippingResult = await addressService.createAddress(user.id, shippingData);

                    if (shippingResult?._id) {
                        await addressService.updateAddress(billingResult._id, {
                            linkedShippingAddressId: shippingResult._id
                        });
                    }
                    toast.success('Adresler başarıyla eklendi');
                } else if (billingResult) {
                    toast.success('Adres başarıyla eklendi');
                } else {
                    toast.error('Adres eklenemedi');
                }
            }

            onSuccess();
            handleClose();

        } catch (error) {
            toast.error('Bir hata oluştu');
        } finally {
            setLoading(false);
        }
    };

    const onError = () => {
        toast.error('Lütfen zorunlu alanları doldurunuz');
    };

    const handleClose = () => {
        reset(getDefaultValues(null, null));
        setInitialLoadDone(false);
        setShippingInitialLoadDone(false);
        setLinkedShippingAddress(null);
        onClose();
    };

    return (
        <Modal open={isOpen} onClose={handleClose}>
            <Box sx={modalStyle}>
                <div className="d-flex justify-content-between align-items-center p-3 border-bottom">
                    <h5 className="mb-0">{isEditMode ? 'Adresi Düzenle' : 'Yeni Adres Ekle'}</h5>
                    <button type="button" className="btn-close" onClick={handleClose}></button>
                </div>

                <div className="p-3">
                    <div className="row mb-3">
                        <div className="col-12">
                            <label className="form-label">Adres Adı <span className="text-danger">*</span></label>
                            <input
                                type="text"
                                className={`form-control ${errors.addressName ? 'is-invalid' : watchAll.addressName ? 'is-valid' : ''}`}
                                placeholder="Ev, İş, Yazlık vb."
                                {...register('addressName')}
                            />
                            {errors.addressName && <div className="invalid-feedback">{errors.addressName.message}</div>}
                        </div>
                    </div>
                    <div className="row mb-3">
                        <div className="col-md-4">
                            <label className="form-label">İl <span className="text-danger">*</span></label>
                            <select
                                className={`form-select ${errors.cityId ? 'is-invalid' : watchAll.cityId ? 'is-valid' : ''}`}
                                value={watchAll.cityId}
                                onChange={handleCityChange}
                                disabled={locationLoading.cities}
                            >
                                <option value="">İl Seçiniz</option>
                                {cities.map(city => (
                                    <option key={city.cityId} value={city.cityId}>{city.cityName}</option>
                                ))}
                            </select>
                            {errors.cityId && <div className="invalid-feedback">{errors.cityId.message}</div>}
                        </div>
                        <div className="col-md-4">
                            <label className="form-label">İlçe <span className="text-danger">*</span></label>
                            <select
                                className={`form-select ${errors.districtId ? 'is-invalid' : watchAll.districtId ? 'is-valid' : ''}`}
                                value={watchAll.districtId}
                                onChange={handleDistrictChange}
                                disabled={!watchAll.cityId || locationLoading.districts}
                            >
                                <option value="">İlçe Seçiniz</option>
                                {districts.map(district => (
                                    <option key={district.districtId} value={district.districtId}>{district.districtName}</option>
                                ))}
                            </select>
                            {errors.districtId && <div className="invalid-feedback">{errors.districtId.message}</div>}
                        </div>
                        <div className="col-md-4">
                            <label className="form-label">Mahalle <span className="text-danger">*</span></label>
                            <select
                                className={`form-select ${errors.neighborhoodId ? 'is-invalid' : watchAll.neighborhoodId ? 'is-valid' : ''}`}
                                value={watchAll.neighborhoodId}
                                onChange={handleNeighborhoodChange}
                                disabled={!watchAll.districtId || locationLoading.neighborhoods}
                            >
                                <option value="">Mahalle Seçiniz</option>
                                {neighborhoods.map(n => (
                                    <option key={n.neighborhoodId} value={n.neighborhoodId}>{n.neighborhoodName}</option>
                                ))}
                            </select>
                            {errors.neighborhoodId && <div className="invalid-feedback">{errors.neighborhoodId.message}</div>}
                        </div>
                    </div>

                    <div className="row mb-3">
                        <div className="col-md-6">
                            <label className="form-label">Sokak / Cadde <span className="text-danger">*</span></label>
                            <input
                                type="text"
                                className={`form-control ${errors.street ? 'is-invalid' : watchAll.street ? 'is-valid' : ''}`}
                                {...register('street')}
                            />
                            {errors.street && <div className="invalid-feedback">{errors.street.message}</div>}
                        </div>
                        <div className="col-md-2">
                            <label className="form-label">Bina No <span className="text-danger">*</span></label>
                            <input
                                type="text"
                                className={`form-control ${errors.buildingNo ? 'is-invalid' : watchAll.buildingNo ? 'is-valid' : ''}`}
                                {...register('buildingNo')}
                            />
                            {errors.buildingNo && <div className="invalid-feedback">{errors.buildingNo.message}</div>}
                        </div>
                        <div className="col-md-2">
                            <label className="form-label">Kat</label>
                            <input
                                type="text"
                                className="form-control"
                                {...register('floor')}
                            />
                        </div>
                        <div className="col-md-2">
                            <label className="form-label">Daire No</label>
                            <input
                                type="text"
                                className="form-control"
                                {...register('apartmentNo')}
                            />
                        </div>
                    </div>

                    <div className="row mb-3">
                        <div className="col-12">
                            <label className="form-label">Adres Tarifi</label>
                            <textarea
                                className="form-control"
                                rows={2}
                                {...register('addressNote')}
                            />
                        </div>
                    </div>

                    <hr />

                    <div className="row mb-3">
                        <div className="col-12">
                            <label className="form-label">Fatura Tipi</label>
                            <select
                                className="form-select"
                                {...register('invoiceType')}
                            >
                                <option value="individual">Bireysel</option>
                                <option value="corporate">Kurumsal</option>
                            </select>
                        </div>
                    </div>

                    {invoiceType === 'individual' && (
                        <div className="row mb-3">
                            <div className="col-md-6">
                                <label className="form-label">İsim Soyisim <span className="text-danger">*</span></label>
                                <input
                                    type="text"
                                    className={`form-control ${errors.fullName ? 'is-invalid' : watchAll.fullName ? 'is-valid' : ''}`}
                                    {...register('fullName')}
                                />
                                {errors.fullName && <div className="invalid-feedback">{errors.fullName.message}</div>}
                            </div>
                            <div className="col-md-6">
                                <label className="form-label">TC Kimlik No</label>
                                <input
                                    type="text"
                                    className={`form-control ${errors.tcNo ? 'is-invalid' : watchAll.tcNo && watchAll.tcNo.length === 11 ? 'is-valid' : ''}`}
                                    maxLength={11}
                                    {...register('tcNo')}
                                />
                                {errors.tcNo && <div className="invalid-feedback">{errors.tcNo.message}</div>}
                            </div>
                        </div>
                    )}

                    {invoiceType === 'corporate' && (
                        <>
                            <div className="row mb-3">
                                <div className="col-md-6">
                                    <label className="form-label">Ticari Ünvan <span className="text-danger">*</span></label>
                                    <input
                                        type="text"
                                        className={`form-control ${errors.companyName ? 'is-invalid' : watchAll.companyName ? 'is-valid' : ''}`}
                                        {...register('companyName')}
                                    />
                                    {errors.companyName && <div className="invalid-feedback">{errors.companyName.message}</div>}
                                </div>
                                <div className="col-md-6">
                                    <label className="form-label">Yetkili Kişi</label>
                                    <input
                                        type="text"
                                        className={`form-control ${watchAll.authorizedPerson ? 'is-valid' : ''}`}
                                        {...register('authorizedPerson')}
                                    />
                                </div>
                            </div>
                            <div className="row mb-3">
                                <div className="col-md-6">
                                    <label className="form-label">Vergi Dairesi <span className="text-danger">*</span></label>
                                    <input
                                        type="text"
                                        className={`form-control ${errors.taxOffice ? 'is-invalid' : watchAll.taxOffice ? 'is-valid' : ''}`}
                                        {...register('taxOffice')}
                                    />
                                    {errors.taxOffice && <div className="invalid-feedback">{errors.taxOffice.message}</div>}
                                </div>
                                <div className="col-md-6">
                                    <label className="form-label">Vergi No <span className="text-danger">*</span></label>
                                    <input
                                        type="text"
                                        className={`form-control ${errors.taxNo ? 'is-invalid' : watchAll.taxNo && watchAll.taxNo.length === 10 ? 'is-valid' : ''}`}
                                        maxLength={10}
                                        {...register('taxNo')}
                                    />
                                    {errors.taxNo && <div className="invalid-feedback">{errors.taxNo.message}</div>}
                                </div>
                            </div>
                        </>
                    )}

                    <div className="form-check mb-3">
                        <input
                            type="checkbox"
                            className="form-check-input"
                            id="isDefault"
                            {...register('isDefault')}
                        />
                        <label className="form-check-label" htmlFor="isDefault">
                            Varsayılan adres olarak ayarla
                        </label>
                    </div>

                    <hr />

                    <div className="form-check mb-3">
                        <input
                            type="checkbox"
                            className="form-check-input"
                            id="differentShipping"
                            {...register('differentShipping')}
                        />
                        <label className="form-check-label" htmlFor="differentShipping">
                            Ürünlerim farklı bir <strong>teslimat adresine</strong> gönderilsin.
                        </label>
                    </div>

                    {differentShipping && (
                        <div className="border rounded p-3 bg-light">
                            <h6 className="mb-3">Teslimat Adresi</h6>

                            <div className="row mb-3">
                                <div className="col-md-6">
                                    <label className="form-label">Teslim Edilecek Kişi <span className="text-danger">*</span></label>
                                    <input
                                        type="text"
                                        className={`form-control ${errors.shippingFullName ? 'is-invalid' : watchAll.shippingFullName ? 'is-valid' : ''}`}
                                        {...register('shippingFullName')}
                                    />
                                    {errors.shippingFullName && <div className="invalid-feedback">{errors.shippingFullName.message}</div>}
                                </div>
                                <div className="col-md-6">
                                    <label className="form-label">Cep Telefonu <span className="text-danger">*</span></label>
                                    <div className="input-group">
                                        <span className="input-group-text">+90</span>
                                        <input
                                            type="tel"
                                            className={`form-control ${errors.shippingPhone ? 'is-invalid' : watchAll.shippingPhone ? 'is-valid' : ''}`}
                                            placeholder="5XX XXX XX XX"
                                            value={displayPhoneNumber(watchAll.shippingPhone || '')}
                                            onChange={(e) => {
                                                const formatted = formatPhoneNumber(e.target.value);
                                                setValue('shippingPhone', parsePhoneNumber(formatted), { shouldValidate: true });
                                            }}
                                        />
                                    </div>
                                    {errors.shippingPhone && <div className="invalid-feedback d-block">{errors.shippingPhone.message}</div>}
                                </div>
                            </div>

                            <div className="row mb-3">
                                <div className="col-md-4">
                                    <label className="form-label">İl <span className="text-danger">*</span></label>
                                    <select
                                        className={`form-select ${errors.shippingCityId ? 'is-invalid' : watchAll.shippingCityId ? 'is-valid' : ''}`}
                                        value={watchAll.shippingCityId || ''}
                                        onChange={handleShippingCityChange}
                                        disabled={locationLoading.cities}
                                    >
                                        <option value="">İl Seçiniz</option>
                                        {cities.map(city => (
                                            <option key={city.cityId} value={city.cityId}>{city.cityName}</option>
                                        ))}
                                    </select>
                                    {errors.shippingCityId && <div className="invalid-feedback">{errors.shippingCityId.message}</div>}
                                </div>
                                <div className="col-md-4">
                                    <label className="form-label">İlçe <span className="text-danger">*</span></label>
                                    <select
                                        className={`form-select ${errors.shippingDistrictId ? 'is-invalid' : watchAll.shippingDistrictId ? 'is-valid' : ''}`}
                                        value={watchAll.shippingDistrictId || ''}
                                        onChange={handleShippingDistrictChange}
                                        disabled={!watchAll.shippingCityId || shippingLocationLoading.districts}
                                    >
                                        <option value="">İlçe Seçiniz</option>
                                        {shippingDistricts.map(district => (
                                            <option key={district.districtId} value={district.districtId}>{district.districtName}</option>
                                        ))}
                                    </select>
                                    {errors.shippingDistrictId && <div className="invalid-feedback">{errors.shippingDistrictId.message}</div>}
                                </div>
                                <div className="col-md-4">
                                    <label className="form-label">Mahalle <span className="text-danger">*</span></label>
                                    <select
                                        className={`form-select ${errors.shippingNeighborhoodId ? 'is-invalid' : watchAll.shippingNeighborhoodId ? 'is-valid' : ''}`}
                                        value={watchAll.shippingNeighborhoodId || ''}
                                        onChange={handleShippingNeighborhoodChange}
                                        disabled={!watchAll.shippingDistrictId || shippingLocationLoading.neighborhoods}
                                    >
                                        <option value="">Mahalle Seçiniz</option>
                                        {shippingNeighborhoods.map(n => (
                                            <option key={n.neighborhoodId} value={n.neighborhoodId}>{n.neighborhoodName}</option>
                                        ))}
                                    </select>
                                    {errors.shippingNeighborhoodId && <div className="invalid-feedback">{errors.shippingNeighborhoodId.message}</div>}
                                </div>
                            </div>

                            <div className="row mb-3">
                                <div className="col-md-6">
                                    <label className="form-label">Sokak / Cadde <span className="text-danger">*</span></label>
                                    <input
                                        type="text"
                                        className={`form-control ${errors.shippingStreet ? 'is-invalid' : watchAll.shippingStreet ? 'is-valid' : ''}`}
                                        {...register('shippingStreet')}
                                    />
                                    {errors.shippingStreet && <div className="invalid-feedback">{errors.shippingStreet.message}</div>}
                                </div>
                                <div className="col-md-2">
                                    <label className="form-label">Bina No <span className="text-danger">*</span></label>
                                    <input
                                        type="text"
                                        className={`form-control ${errors.shippingBuildingNo ? 'is-invalid' : watchAll.shippingBuildingNo ? 'is-valid' : ''}`}
                                        {...register('shippingBuildingNo')}
                                    />
                                    {errors.shippingBuildingNo && <div className="invalid-feedback">{errors.shippingBuildingNo.message}</div>}
                                </div>
                                <div className="col-md-2">
                                    <label className="form-label">Kat</label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        {...register('shippingFloor')}
                                    />
                                </div>
                                <div className="col-md-2">
                                    <label className="form-label">Daire No</label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        {...register('shippingApartmentNo')}
                                    />
                                </div>
                            </div>

                            <div className="row">
                                <div className="col-12">
                                    <label className="form-label">Adres Tarifi</label>
                                    <textarea
                                        className="form-control"
                                        rows={2}
                                        {...register('shippingAddressNote')}
                                    />
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="d-flex justify-content-end gap-2 p-3 border-top">
                    <button type="button" className="btn btn-secondary" onClick={handleClose}>
                        İptal
                    </button>
                    <button
                        type="button"
                        className="btn btn-primary"
                        onClick={handleSubmit(onSubmit, onError)}
                        disabled={loading}
                    >
                        {loading ? 'Kaydediliyor...' : (isEditMode ? 'Güncelle' : 'Kaydet')}
                    </button>
                </div>
            </Box>
        </Modal>
    );
}