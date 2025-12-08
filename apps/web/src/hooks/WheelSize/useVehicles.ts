// apps/web/src/hooks/Vehicle/useVehicles.ts
import { useState, useEffect } from 'react';
import { api } from '@/src/lib/api';
import type { Vehicle } from '@/src/types/vehicle';
import { toast } from 'react-toastify';

export const useVehicles = () => {
    const [vehicles, setVehicles] = useState<Vehicle[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchVehicles = async () => {
        try {
            setLoading(true);
            const response = await api.vehicle.getAll();

            if (response.success && response.data) {
                setVehicles(response.data);
            } else {
                setError(response.message || 'Araçlar yüklenemedi');
            }
        } catch (err) {
            setError('Bir hata oluştu');
            console.error('Vehicle fetch error:', err);
        } finally {
            setLoading(false);
        }
    };

    const addVehicle = async (data: any) => {
        try {
            const response = await api.vehicle.create(data);

            if (response.success) {
                toast.success(response.message || 'Araç başarıyla eklendi');
                await fetchVehicles();
                return { success: true };
            } else {
                toast.error(response.message || 'Araç eklenemedi');
                return { success: false, message: response.message };
            }
        } catch (err) {
            toast.error('Bir hata oluştu');
            return { success: false };
        }
    };

    const updateVehicle = async (id: string, data: any) => {
        try {
            const response = await api.vehicle.update(id, data);

            if (response.success) {
                toast.success(response.message || 'Araç başarıyla güncellendi');
                await fetchVehicles();
                return { success: true };
            } else {
                toast.error(response.message || 'Araç güncellenemedi');
                return { success: false };
            }
        } catch (err) {
            toast.error('Bir hata oluştu');
            return { success: false };
        }
    };

    const deleteVehicle = async (id: string) => {
        try {
            const response = await api.vehicle.delete(id);

            if (response.success) {
                toast.success(response.message || 'Araç başarıyla silindi');
                await fetchVehicles();
                return { success: true };
            } else {
                toast.error(response.message || 'Araç silinemedi');
                return { success: false };
            }
        } catch (err) {
            toast.error('Bir hata oluştu');
            return { success: false };
        }
    };

    const setPrimaryVehicle = async (id: string) => {
        try {
            const response = await api.vehicle.setPrimary(id);

            if (response.success) {
                toast.success(response.message || 'Varsayılan araç güncellendi');
                await fetchVehicles();
                return { success: true };
            } else {
                toast.error(response.message || 'Varsayılan araç güncellenemedi');
                return { success: false };
            }
        } catch (err) {
            toast.error('Bir hata oluştu');
            return { success: false };
        }
    };

    useEffect(() => {
        fetchVehicles();
    }, []);

    return {
        vehicles,
        loading,
        error,
        refetch: fetchVehicles,
        addVehicle,
        updateVehicle,
        deleteVehicle,
        setPrimaryVehicle
    };
};