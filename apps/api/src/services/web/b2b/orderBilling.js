const INVOICE_TYPES = { kurumsal: 'corporate', bireysel: 'individual' };

function buildBillingSnapshot(member, title) {
    const cari = member?.diaCari || {};
    const addresses = cari.addresses || [];
    const mainAddress = addresses.find(a => a.ana) || addresses[0] || {};
    return {
        addressName: mainAddress.baslik || '',
        invoiceType: INVOICE_TYPES[cari.firmaTuru] || (cari.vergiNo ? INVOICE_TYPES.kurumsal : INVOICE_TYPES.bireysel),
        fullName: title || '',
        companyName: title || '',
        taxOffice: cari.vergiDairesi || '',
        taxNo: cari.vergiNo || '',
        tcNo: cari.tcKimlikNo || '',
        email: member?.email || '',
        phone: mainAddress.telefon || member?.phone || '',
        cityName: mainAddress.il || '',
        districtName: mainAddress.ilce || '',
        street: mainAddress.adres || ''
    };
}

module.exports = { buildBillingSnapshot };
