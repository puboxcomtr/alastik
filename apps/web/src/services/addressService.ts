import { API_ENDPOINTS, getServerSiteHeaders } from '@/src/config/api';
import { Address, AddressFormData } from '@/src/types/adress';

export const addressService = {
    async getUserAddresses(userId: string): Promise<Address[]> {
        try {
            const res = await fetch(API_ENDPOINTS.address.list(userId), {
                headers: { ...(await getServerSiteHeaders()) }
            });
            const data = await res.json();
            return data.success ? data.data : [];
        } catch (error) {
            console.error('[addressService] getUserAddresses error:', error);
            return [];
        }
    },

    async getAddress(addressId: string): Promise<Address | null> {
        try {
            const res = await fetch(API_ENDPOINTS.address.detail(addressId), {
                headers: { ...(await getServerSiteHeaders()) }
            });
            const data = await res.json();
            return data.success ? data.data : null;
        } catch (error) {
            console.error('[addressService] getAddress error:', error);
            return null;
        }
    },

    async createAddress(userId: string, addressData: AddressFormData): Promise<Address | null> {
        try {
            const res = await fetch(API_ENDPOINTS.address.create(), {
                method: 'POST',
                body: JSON.stringify({ ...addressData, userId }),
                headers: {
                    ...(await getServerSiteHeaders()),
                    'Content-Type': 'application/json'
                }
            });
            const data = await res.json();
            return data.success ? data.data : null;
        } catch (error) {
            console.error('[addressService] createAddress error:', error);
            return null;
        }
    },

    async updateAddress(addressId: string, addressData: Partial<AddressFormData>): Promise<Address | null> {
        try {
            const res = await fetch(API_ENDPOINTS.address.update(addressId), {
                method: 'PUT',
                body: JSON.stringify(addressData),
                headers: {
                    ...(await getServerSiteHeaders()),
                    'Content-Type': 'application/json'
                }
            });
            const data = await res.json();
            return data.success ? data.data : null;
        } catch (error) {
            console.error('[addressService] updateAddress error:', error);
            return null;
        }
    },

    async deleteAddress(addressId: string): Promise<boolean> {
        try {
            const res = await fetch(API_ENDPOINTS.address.delete(addressId), {
                method: 'DELETE',
                headers: { ...(await getServerSiteHeaders()) }
            });
            const data = await res.json();
            return data.success;
        } catch (error) {
            console.error('[addressService] deleteAddress error:', error);
            return false;
        }
    },

    async setDefaultAddress(addressId: string): Promise<boolean> {
        try {
            const res = await fetch(API_ENDPOINTS.address.update(addressId), {
                method: 'PUT',
                body: JSON.stringify({ isDefault: true }),
                headers: {
                    ...(await getServerSiteHeaders()),
                    'Content-Type': 'application/json'
                }
            });
            const data = await res.json();
            return data.success;
        } catch (error) {
            console.error('[addressService] setDefaultAddress error:', error);
            return false;
        }
    }
};