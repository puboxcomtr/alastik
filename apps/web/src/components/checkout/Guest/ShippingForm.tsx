'use client';

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { locationService, City, District, Neighborhood } from '@/src/services/locationService';
import { formatPhoneNumber, parsePhoneNumber, displayPhoneNumber } from '@/src/hooks/helper';

// Zod Schema
const shippingSchema = z.object({
  recipientName: z.string().min(1, 'Teslim edilecek kişi zorunludur'),
  phone: z.string().regex(/^\+90\d{10}$/, 'Geçerli bir telefon numarası giriniz'),
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
  addressNote: z.string().optional()
});

export type ShippingData = z.infer<typeof shippingSchema>;

interface ShippingFormProps {
  data: ShippingData;
  onChange: (data: ShippingData) => void;
}

export default function ShippingForm({ data, onChange }: ShippingFormProps) {
  const [cities, setCities] = useState<City[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [neighborhoods, setNeighborhoods] = useState<Neighborhood[]>([]);
  const [loading, setLoading] = useState({ cities: true, districts: false, neighborhoods: false });

  const {
    register,
    watch,
    setValue,
    formState: { errors }
  } = useForm<ShippingData>({
    resolver: zodResolver(shippingSchema),
    defaultValues: data,
    mode: 'onChange'
  });

  const cityId = watch('cityId');
  const districtId = watch('districtId');
  const watchAll = watch();

  useEffect(() => {
    const subscription = watch((value) => {
      onChange(value as ShippingData);
    });
    return () => subscription.unsubscribe();
  }, [watch, onChange]);

  useEffect(() => {
    loadCities();
  }, []);

  useEffect(() => {
    if (cityId) loadDistricts(cityId);
  }, [cityId]);

  useEffect(() => {
    if (districtId) loadNeighborhoods(districtId);
  }, [districtId]);

  const loadCities = async () => {
    setLoading(prev => ({ ...prev, cities: true }));
    const result = await locationService.getCities();
    setCities(result);
    setLoading(prev => ({ ...prev, cities: false }));
  };

  const loadDistricts = async (cityId: string) => {
    setLoading(prev => ({ ...prev, districts: true }));
    setDistricts([]);
    setNeighborhoods([]);
    const result = await locationService.getDistricts(cityId);
    setDistricts(result);
    setLoading(prev => ({ ...prev, districts: false }));
  };

  const loadNeighborhoods = async (districtId: string) => {
    setLoading(prev => ({ ...prev, neighborhoods: true }));
    setNeighborhoods([]);
    const result = await locationService.getNeighborhoods(districtId);
    setNeighborhoods(result);
    setLoading(prev => ({ ...prev, neighborhoods: false }));
  };

  const handleCityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    const city = cities.find(c => c.cityId === value);
    setValue('cityId', value);
    setValue('cityName', city?.cityName || '');
    setValue('districtId', '');
    setValue('districtName', '');
    setValue('neighborhoodId', '');
    setValue('neighborhoodName', '');
  };

  const handleDistrictChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    const district = districts.find(d => d.districtId === value);
    setValue('districtId', value);
    setValue('districtName', district?.districtName || '');
    setValue('neighborhoodId', '');
    setValue('neighborhoodName', '');
  };

  const handleNeighborhoodChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    const neighborhood = neighborhoods.find(n => n.neighborhoodId === value);
    setValue('neighborhoodId', value);
    setValue('neighborhoodName', neighborhood?.neighborhoodName || '');
  };

  return (
    <div className="card border-0">
      <div className="card-body py-0">
        <hr />
        <h5>Teslimat Bilgileri</h5>
        <div className="row">
          <div className="col-md-6 mb-3">
            <label className="form-label">Teslim Edilecek Kişi <span className="text-danger">*</span></label>
            <input
              type="text"
              className={`form-control form-control-lg ${errors.recipientName ? 'is-invalid' : watchAll.recipientName ? 'is-valid' : ''}`}
              {...register('recipientName')}
            />
            {errors.recipientName && <div className="invalid-feedback">{errors.recipientName.message}</div>}
          </div>
          <div className="col-md-6 mb-3">
            <label className="form-label">Cep Telefonu <span className="text-danger">*</span></label>
            <div className="input-group">
              <span className="input-group-text">+90</span>
              <input
                type="tel"
                className={`form-control form-control-lg ${errors.phone ? 'is-invalid' : watchAll.phone ? 'is-valid' : ''}`}
                placeholder="5XX XXX XX XX"
                value={displayPhoneNumber(watchAll.phone || '')}
                onChange={(e) => {
                  const formatted = formatPhoneNumber(e.target.value);
                  setValue('phone', parsePhoneNumber(formatted), { shouldValidate: true });
                }}
              />
            </div>
            {errors.phone && <div className="invalid-feedback d-block">{errors.phone.message}</div>}
          </div>
        </div>

        <div className="row">
          <div className="col-md-4 mb-3">
            <label className="form-label">İl <span className="text-danger">*</span></label>
            <select
              className={`form-select form-select-lg ${errors.cityId ? 'is-invalid' : watchAll.cityId ? 'is-valid' : ''}`}
              disabled={loading.cities}
              value={watchAll.cityId}
              onChange={handleCityChange}
            >
              <option value="">İl Seçiniz</option>
              {cities.map(city => (
                <option key={city.cityId} value={city.cityId}>{city.cityName}</option>
              ))}
            </select>
            {errors.cityId && <div className="invalid-feedback">{errors.cityId.message}</div>}
          </div>
          <div className="col-md-4 mb-3">
            <label className="form-label">İlçe <span className="text-danger">*</span></label>
            <select
              className={`form-select form-select-lg ${errors.districtId ? 'is-invalid' : watchAll.districtId ? 'is-valid' : ''}`}
              disabled={!watchAll.cityId || loading.districts}
              value={watchAll.districtId}
              onChange={handleDistrictChange}
            >
              <option value="">İlçe Seçiniz</option>
              {districts.map(district => (
                <option key={district.districtId} value={district.districtId}>{district.districtName}</option>
              ))}
            </select>
            {errors.districtId && <div className="invalid-feedback">{errors.districtId.message}</div>}
          </div>
          <div className="col-md-4 mb-3">
            <label className="form-label">Mahalle <span className="text-danger">*</span></label>
            <select
              className={`form-select form-select-lg ${errors.neighborhoodId ? 'is-invalid' : watchAll.neighborhoodId ? 'is-valid' : ''}`}
              disabled={!watchAll.districtId || loading.neighborhoods}
              value={watchAll.neighborhoodId}
              onChange={handleNeighborhoodChange}
            >
              <option value="">Mahalle Seçiniz</option>
              {neighborhoods.map(n => (
                <option key={n.neighborhoodId} value={n.neighborhoodId}>{n.neighborhoodName}</option>
              ))}
            </select>
            {errors.neighborhoodId && <div className="invalid-feedback">{errors.neighborhoodId.message}</div>}
          </div>
        </div>

        <div className="row">
          <div className="col-md-6 mb-3">
            <label className="form-label">Sokak / Cadde <span className="text-danger">*</span></label>
            <input
              type="text"
              className={`form-control form-control-lg ${errors.street ? 'is-invalid' : watchAll.street ? 'is-valid' : ''}`}
              {...register('street')}
            />
            {errors.street && <div className="invalid-feedback">{errors.street.message}</div>}
          </div>
          <div className="col-md-2 mb-3">
            <label className="form-label">Bina No <span className="text-danger">*</span></label>
            <input
              type="text"
              className={`form-control form-control-lg ${errors.buildingNo ? 'is-invalid' : watchAll.buildingNo ? 'is-valid' : ''}`}
              {...register('buildingNo')}
            />
            {errors.buildingNo && <div className="invalid-feedback">{errors.buildingNo.message}</div>}
          </div>
          <div className="col-md-2 mb-3">
            <label className="form-label">Kat</label>
            <input
              type="text"
              className="form-control form-control-lg"
              {...register('floor')}
            />
          </div>
          <div className="col-md-2 mb-3">
            <label className="form-label">Daire No</label>
            <input
              type="text"
              className="form-control form-control-lg"
              {...register('apartmentNo')}
            />
          </div>
        </div>

        <div className="mb-3">
          <label className="form-label">Adres Tarifi</label>
          <textarea
            className="form-control form-control-lg"
            rows={2}
            {...register('addressNote')}
          />
        </div>

      </div>
    </div>
  );
}