import { useState } from 'react';
import { api } from '@/src/lib/api';

export const useWheelSize = () => {
    const [loading, setLoading] = useState(false);

    const getMakes = async () => {
        try {
            setLoading(true);
            const response = await api.wheelSize.getMakes();
            return response.success ? response.data : [];
        } catch (error) {
            console.error('Makes fetch error:', error);
            return [];
        } finally {
            setLoading(false);
        }
    };

    const getModels = async (make: string) => {
        try {
            setLoading(true);
            const response = await api.get(`/wheelsize/models?make=${make}`);
            return response.success ? response.data : [];
        } catch (error) {
            console.error('Models fetch error:', error);
            return [];
        } finally {
            setLoading(false);
        }
    };

    const getYears = async (make: string, model: string) => {
        try {
            setLoading(true);
            const response = await api.get(`/wheelsize/years?make=${make}&model=${model}`);
            return response.success ? response.data : [];
        } catch (error) {
            console.error('Years fetch error:', error);
            return [];
        } finally {
            setLoading(false);
        }
    };

    const getGenerations = async (make: string, model: string) => {
        try {
            setLoading(true);
            const response = await api.get(`/wheelsize/generations?make=${make}&model=${model}`);
            return response.success ? response.data : [];
        } catch (error) {
            console.error('Generations fetch error:', error);
            return [];
        } finally {
            setLoading(false);
        }
    };

    const getModifications = async (make: string, model: string, year: number, generation?: string) => {
        try {
            setLoading(true);
            const url = generation
                ? `/wheelsize/modifications?make=${make}&model=${model}&year=${year}&generation=${generation}`
                : `/wheelsize/modifications?make=${make}&model=${model}&year=${year}`;

            const response = await api.get(url);
            return response.success ? response.data : [];
        } catch (error) {
            console.error('Modifications fetch error:', error);
            return [];
        } finally {
            setLoading(false);
        }
    };

    return {
        loading,
        getMakes,
        getModels,
        getYears,
        getGenerations,
        getModifications
    };
};