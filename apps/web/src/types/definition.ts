export interface Definition {
    _id: string;
    companyInfo: {
        name: string;
        officialName: string;
        website: string;
        authorizedPerson: string;
        phone: string;
        phone2: string;
        fax: string;
        country: string;
        city: string;
        district: string;
        postalCode: string;
        address: string;
    };
    emailInfo: {
        email: string;
        orderEmail: string;
    };
    taxInfo: {
        registrationNumber: string;
        taxOffice: string;
        taxNumber: string;
    };
    legalContracts: {
        contact: string;
        preInformation: string;
        membershipAgreement: string;
        kvkk: string;
        salesAgreement: string;
        returnPolicy: string;
        salesConditions: string;
    };
    images: {
        mailLogo: string;
        favicon: string;
    };
    createdAt: string;
    updatedAt: string;
}