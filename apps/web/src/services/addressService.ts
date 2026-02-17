// apps/web/src/services/addressService.ts
import { API_ENDPOINTS } from '@/src/config/api';
import { Address, AddressFormData } from '@/src/types/adress';

export const addressService = {
    // Kullanici adreslerini getir
    async getUserAddresses(userId: string): Promise<Address[]> {
        try {
            const res = await fetch(API_ENDPOINTS.address.list(userId));
            const data = await res.json();
            return data.success ? data.data : [];
        } catch (error) {
            console.error('[addressService] getUserAddresses error:', error);
            return [];
        }
    },

    // Tek adres getir
    async getAddress(addressId: string): Promise<Address | null> {
        try {
            const res = await fetch(API_ENDPOINTS.address.detail(addressId));
            const data = await res.json();
            return data.success ? data.data : null;
        } catch (error) {
            console.error('[addressService] getAddress error:', error);
            return null;
        }
    },

    // Adres ekle
    async createAddress(userId: string, addressData: AddressFormData): Promise<Address | null> {
        try {
            const res = await fetch(API_ENDPOINTS.address.create(), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...addressData, userId })
            });
            const data = await res.json();
            return data.success ? data.data : null;
        } catch (error) {
            console.error('[addressService] createAddress error:', error);
            return null;
        }
    },

    // Adres guncelle
    async updateAddress(addressId: string, addressData: Partial<AddressFormData>): Promise<Address | null> {
        try {
            const res = await fetch(API_ENDPOINTS.address.update(addressId), {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(addressData)
            });
            const data = await res.json();
            return data.success ? data.data : null;
        } catch (error) {
            console.error('[addressService] updateAddress error:', error);
            return null;
        }
    },

    // Adres sil
    async deleteAddress(addressId: string): Promise<boolean> {
        try {
            const res = await fetch(API_ENDPOINTS.address.delete(addressId), {
                method: 'DELETE'
            });
            const data = await res.json();
            return data.success;
        } catch (error) {
            console.error('[addressService] deleteAddress error:', error);
            return false;
        }
    },

    // Varsayilan adres yap
    async setDefaultAddress(addressId: string): Promise<boolean> {
        try {
            const res = await fetch(API_ENDPOINTS.address.update(addressId), {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isDefault: true })
            });
            const data = await res.json();
            return data.success;
        } catch (error) {
            console.error('[addressService] setDefaultAddress error:', error);
            return false;
        }
    }
};