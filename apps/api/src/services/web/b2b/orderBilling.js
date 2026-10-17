/**
 * Bayi siparişinin fatura bilgileri — carinin DIA kartından (ünvan, vergi dairesi / no, ana adres) alınır.
 * Bayi sitesinde fatura bilgisi sorulmaz; panelde sipariş detayındaki "Fatura Bilgileri" bölümü bu kayıttan dolar.
 */
// DIA cari kartındaki firma türü → siparişteki fatura tipi
const INVOICE_TYPES = { kurumsal: 'corporate', bireysel: 'individual' };

/**
 * @param {object} member WebMember (diaCari dahil)
 * @param {string} title carinin ünvanı (siparişteki müşteri adı)
 * @returns {object} WebOrder.billingSnapshot
 */
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
