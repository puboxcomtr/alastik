
class XmlDiaService {
    async syncToDia() {
        console.warn('[XmlDiaService] Devre dışı - DIA aktarımı kaldırıldı');
        return { success: false, message: 'Devre dışı' };
    }
    async syncSingleProduct() {
        return { success: false, message: 'Devre dışı' };
    }
    async syncPriceAndStockForSynced() {
        return { success: false, message: 'Devre dışı' };
    }
}

module.exports = new XmlDiaService();