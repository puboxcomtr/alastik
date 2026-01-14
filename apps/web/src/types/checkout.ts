// Billing Types
export interface BillingData {
    invoiceType: 'individual' | 'corporate';
    fullName: string;
    tcNo: string;
    companyName: string;
    taxOffice: string;
    taxNo: string;
    authorizedPerson: string;
    email: string;
    phone: string;
    cityId: string;
    cityName: string;
    districtId: string;
    districtName: string;
    neighborhoodId: string;
    neighborhoodName: string;
    street: string;
    buildingNo: string;
    floor: string;
    apartmentNo: string;
    addressNote: string;
}

export const initialBillingData: BillingData = {
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
    addressNote: ''
};

// Shipping Types
export interface ShippingData {
    recipientName: string;
    phone: string;
    cityId: string;
    cityName: string;
    districtId: string;
    districtName: string;
    neighborhoodId: string;
    neighborhoodName: string;
    street: string;
    buildingNo: string;
    floor?: string;
    apartmentNo?: string;
    addressNote?: string;
}

export const initialShippingData: ShippingData = {
    recipientName: '',
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
    addressNote: ''
};