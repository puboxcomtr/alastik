import { API_ENDPOINTS } from '@/src/config/api';

export interface City {
    _id: string;
    cityId: string;
    cityName: string;
}

export interface District {
    _id: string;
    districtId: string;
    districtName: string;
    cityId: string;
}

export interface Neighborhood {
    _id: string;
    neighborhoodId: string;
    neighborhoodName: string;
    districtId: string;
    cityId: string;
}

export const locationService = {
    async getCities(): Promise<City[]> {
        try {
            const res = await fetch(API_ENDPOINTS.location.cities());
            const data = await res.json();
            return data.success ? data.data : [];
        } catch (error) {
            console.error('[locationService] getCities error:', error);
            return [];
        }
    },

    async getDistricts(cityId: string): Promise<District[]> {
        try {
            const res = await fetch(API_ENDPOINTS.location.districts(cityId));
            const data = await res.json();
            return data.success ? data.data : [];
        } catch (error) {
            console.error('[locationService] getDistricts error:', error);
            return [];
        }
    },

    async getNeighborhoods(districtId: string): Promise<Neighborhood[]> {
        try {
            const res = await fetch(API_ENDPOINTS.location.neighborhoods(districtId));
            const data = await res.json();
            return data.success ? data.data : [];
        } catch (error) {
            console.error('[locationService] getNeighborhoods error:', error);
            return [];
        }
    }
};