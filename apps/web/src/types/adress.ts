export interface Address {
    _id: string;
    linkedShippingAddressId?: string | null;
    userId?: string;
    sessionId?: string;

    // Adres Tanımı
    addressName: string;
    addressDescription?: string;

    // Fatura Tipi
    invoiceType: 'individual' | 'corporate';

    // Bireysel
    fullName?: string;
    tcNo?: string;

    // Kurumsal
    companyName?: string;
    taxOffice?: string;
    taxNo?: string;
    authorizedPerson?: string;

    // İletişim
    email: string;
    phone: string;

    // Lokasyon
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

    // Flags
    isDefault: boolean;
    isBilling: boolean;
    isShipping: boolean;
    isActive?: boolean;

    createdAt: string;
    updatedAt: string;
}

export interface AddressFormData {
    addressName: string;
    invoiceType: 'individual' | 'corporate';
    fullName?: string;
    tcNo?: string;
    companyName?: string;
    taxOffice?: string;
    taxNo?: string;
    authorizedPerson?: string;
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
    floor?: string;
    apartmentNo?: string;
    addressNote?: string;
    isDefault?: boolean;
}