const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3082/api';

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
        const res = await fetch(`${API_URL}/location/cities`);
        const data = await res.json();
        return data.success ? data.data : [];
    },

    async getDistricts(cityId: string): Promise<District[]> {
        const res = await fetch(`${API_URL}/location/districts/${cityId}`);
        const data = await res.json();
        return data.success ? data.data : [];
    },

    async getNeighborhoods(districtId: string): Promise<Neighborhood[]> {
        const res = await fetch(`${API_URL}/location/neighborhoods/${districtId}`);
        const data = await res.json();
        return data.success ? data.data : [];
    }
};