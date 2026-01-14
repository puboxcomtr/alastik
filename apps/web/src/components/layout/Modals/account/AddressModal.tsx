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

// Zod Schema
const addressSchema = z.object({
    addressName: z.string().min(1, 'Adres adı zorunludur'),
    invoiceType: z.enum(['individual', 'corporate']),
    fullName: z.string().optional(),
    tcNo: z.string().regex(/^\d{11}$/, 'TC Kimlik No 11 haneli olmalıdır').optional().or(z.literal('')),
    companyName: z.string().optional(),
    taxOffice: z.string().optional(),
    taxNo: z.string().regex(/^\d{10}$/, 'Vergi No 10 haneli olmalıdır').optional().or(z.literal('')),
    authorizedPerson: z.string().optional(),
    email: z.string().email('Geçerli bir e-posta giriniz'),
    phone: z.string().min(10, 'Geçerli bir telefon numarası giriniz'),
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
    .refine((data) => {
        if (data.invoiceType === 'corporate') {
            return !!data.companyName && !!data.taxOffice && !!data.taxNo;
        }
        return true;
    }, { message: 'Kurumsal bilgiler zorunludur', path: ['companyName'] });

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
}).refine((data) => {
    if (data.differentShipping) {
        return !!data.shippingFullName && !!data.shippingPhone &&
            !!data.shippingCityId && !!data.shippingDistrictId &&
            !!data.shippingNeighborhoodId && !!data.shippingStreet &&
            !!data.shippingBuildingNo;
    }
    return true;
}, { message: 'Teslimat adresi alanları zorunludur', path: ['shippingFullName'] });

const combinedSchema = addressSchema.and(shippingSchema);

type AddressFormData = z.infer<typeof combinedSchema>;

interface AddressModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
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

const defaultValues: AddressFormData = {
    addressName: '',
    invoiceType: 'individual',
    fullName: '',
    tcNo: '',
    companyName: '',
    taxOffice: '',
    taxNo: '',
    authorizedPerson: '',
    email: '',
    phone: '',
    cityId: '',
    cityName: '',
    districtId: '',
    districtName: '',
    neighborhoodId: '',
    neighborhoodName: '',
    street: '',
    buildingNo: '',
    floor: '',
    apartmentNo: '',
    addressNote: '',
    isDefault: false,
    differentShipping: false,
    // Teslimat Adresi Farklı ise
    shippingFullName: '',
    shippingPhone: '',
    shippingCityId: '',
    shippingCityName: '',
    shippingDistrictId: '',
    shippingDistrictName: '',
    shippingNeighborhoodId: '',
    shippingNeighborhoodName: '',
    shippingStreet: '',
    shippingBuildingNo: '',
    shippingFloor: '',
    shippingApartmentNo: '',
    shippingAddressNote: ''
};

export default function AddressModal({ isOpen, onClose, onSuccess }: AddressModalProps) {
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [cities, setCities] = useState<City[]>([]);
    const [districts, setDistricts] = useState<District[]>([]);
    const [neighborhoods, setNeighborhoods] = useState<Neighborhood[]>([]);
    const [locationLoading, setLocationLoading] = useState({ cities: true, districts: false, neighborhoods: false });
    const [shippingDistricts, setShippingDistricts] = useState<District[]>([]);
    const [shippingNeighborhoods, setShippingNeighborhoods] = useState<Neighborhood[]>([]);
    const [shippingLocationLoading, setShippingLocationLoading] = useState({ districts: false, neighborhoods: false });

    const {
        register,
        watch,
        setValue,
        reset,
        handleSubmit,
        formState: { errors }
    } = useForm<AddressFormData>({
        resolver: zodResolver(combinedSchema),
        defaultValues,
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
            loadCities();
        }
    }, [isOpen]);

    useEffect(() => {
        if (cityId) loadDistricts(cityId);
    }, [cityId]);

    useEffect(() => {
        if (districtId) loadNeighborhoods(districtId);
    }, [districtId]);

    useEffect(() => {
        if (shippingCityId) loadShippingDistricts(shippingCityId);
    }, [shippingCityId]);

    useEffect(() => {
        if (shippingDistrictId) loadShippingNeighborhoods(shippingDistrictId);
    }, [shippingDistrictId]);

    const loadCities = async () => {
        setLocationLoading(prev => ({ ...prev, cities: true }));
        const result = await locationService.getCities();
        setCities(result);
        setLocationLoading(prev => ({ ...prev, cities: false }));
    };

    const loadDistricts = async (cityId: string) => {
        setLocationLoading(prev => ({ ...prev, districts: true }));
        setDistricts([]);
        setNeighborhoods([]);
        const result = await locationService.getDistricts(cityId);
        setDistricts(result);
        setLocationLoading(prev => ({ ...prev, districts: false }));
    };

    const loadNeighborhoods = async (districtId: string) => {
        setLocationLoading(prev => ({ ...prev, neighborhoods: true }));
        setNeighborhoods([]);
        const result = await locationService.getNeighborhoods(districtId);
        setNeighborhoods(result);
        setLocationLoading(prev => ({ ...prev, neighborhoods: false }));
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

    const loadShippingDistricts = async (cityId: string) => {
        setShippingLocationLoading(prev => ({ ...prev, districts: true }));
        setShippingDistricts([]);
        setShippingNeighborhoods([]);
        const result = await locationService.getDistricts(cityId);
        setShippingDistricts(result);
        setShippingLocationLoading(prev => ({ ...prev, districts: false }));
    };

    const loadShippingNeighborhoods = async (districtId: string) => {
        setShippingLocationLoading(prev => ({ ...prev, neighborhoods: true }));
        setShippingNeighborhoods([]);
        const result = await locationService.getNeighborhoods(districtId);
        setShippingNeighborhoods(result);
        setShippingLocationLoading(prev => ({ ...prev, neighborhoods: false }));
    };

    const handleShippingCityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
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
            // Fatura adresi kaydet
            const billingAddress = {
                addressName: data.addressName,
                invoiceType: data.invoiceType,
                fullName: data.fullName,
                tcNo: data.tcNo,
                companyName: data.companyName,
                taxOffice: data.taxOffice,
                taxNo: data.taxNo,
                authorizedPerson: data.authorizedPerson,
                email: data.email,
                phone: data.phone,
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
                isShipping: !data.differentShipping
            };

            const billingResult = await addressService.createAddress(user.id, billingAddress);

            // Farklı teslimat adresi varsa onu da kaydet
            if (data.differentShipping) {
                const shippingAddress = {
                    addressName: `${data.addressName} - Teslimat`,
                    invoiceType: 'individual' as const,
                    fullName: data.shippingFullName,
                    email: data.email,
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
                    isShipping: true
                };

                await addressService.createAddress(user.id, shippingAddress);
            }

            if (billingResult) {
                toast.success(data.differentShipping ? 'Adresler başarıyla eklendi' : 'Adres başarıyla eklendi');
                onSuccess();
                handleClose();
            } else {
                toast.error('Adres eklenemedi');
            }
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
        reset(defaultValues);
        onClose();
    };

    return (
        <Modal open={isOpen} onClose={handleClose}>
            <Box sx={modalStyle}>
                {/* Header */}
                <div className="d-flex justify-content-between align-items-center p-3 border-bottom">
                    <h5 className="mb-0">Yeni Adres Ekle</h5>
                    <button type="button" className="btn-close" onClick={handleClose}></button>
                </div>

                {/* Body */}
                <div className="p-3">
                    {/* Adres Adı */}
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

                    {/* İletişim */}
                    <div className="row mb-3">
                        <div className="col-md-6">
                            <label className="form-label">E-Posta <span className="text-danger">*</span></label>
                            <input
                                type="email"
                                className={`form-control ${errors.email ? 'is-invalid' : watchAll.email ? 'is-valid' : ''}`}
                                {...register('email')}
                            />
                            {errors.email && <div className="invalid-feedback">{errors.email.message}</div>}
                        </div>
                        <div className="col-md-6">
                            <label className="form-label">Telefon <span className="text-danger">*</span></label>
                            <input
                                type="tel"
                                className={`form-control ${errors.phone ? 'is-invalid' : watchAll.phone ? 'is-valid' : ''}`}
                                placeholder="+90 5XX XXX XX XX"
                                {...register('phone')}
                            />
                            {errors.phone && <div className="invalid-feedback">{errors.phone.message}</div>}
                        </div>
                    </div>

                    {/* Konum */}
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

                    {/* Adres Detay */}
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

                    {/* Adres Notu */}
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

                    {/* Fatura Tipi */}
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

                    {/* Bireysel */}
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

                    {/* Kurumsal */}
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

                    {/* Varsayılan */}
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

                            {/* Teslim Edilecek Kişi & Telefon */}
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
                                    <input
                                        type="tel"
                                        className={`form-control ${errors.shippingPhone ? 'is-invalid' : watchAll.shippingPhone ? 'is-valid' : ''}`}
                                        placeholder="+90 5XX XXX XX XX"
                                        {...register('shippingPhone')}
                                    />
                                    {errors.shippingPhone && <div className="invalid-feedback">{errors.shippingPhone.message}</div>}
                                </div>
                            </div>

                            {/* Konum */}
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

                            {/* Adres Detay */}
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

                            {/* Adres Tarifi */}
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

                {/* Footer */}
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
                        {loading ? 'Kaydediliyor...' : 'Kaydet'}
                    </button>
                </div>
            </Box>
        </Modal>
    );
}