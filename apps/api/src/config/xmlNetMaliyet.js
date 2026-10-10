// XML tedarikçilerinin gönderdiği fiyatı karşılaştırılabilir NET MALİYETE çeviren çarpanlar.
//
// YALNIZCA "aynı ürün birden fazla tedarikçide varsa hangisi en ucuz?" karşılaştırmasında kullanılır
// (XmlWebProductSyncService.selectBestSource). Ham fiyat, XML Import'ta görünen fiyat ve fiyatlama
// kuralları (xmlpricingrules) DEĞİŞMEZ — o kurallar tedarikçi iskontosunu zaten içerir; çarpan fiyata
// uygulanırsa iskonto iki kez düşülmüş olur.
//
// Tanımlar (9 Ekim 2026):
//   1,20 → fiyat KDV hariç geliyor, %20 KDV eklenir
//   1    → gelen fiyat doğrudan net maliyet
//   0,9x → gelen fiyat iskontosuz; iskontomuz düşülür (0,93 = %7, 0,95 = %5, 0,96 = %4, 0,97 = %3)
// Listede olmayan kaynak için çarpan 1'dir (fiyat olduğu gibi karşılaştırılır).
const CARPANLAR = {
    aslan_kardesler_lastik_xml: 1.20,
    dincbay: 1,
    guler_lastik: 0.95,
    lastikistan_xml_format: 0.93,
    mollaoglu_xml: 0.93,
    simetri: 0.93,
    ozkan_lastik: 1,
    polat_lastik: 0.96,
    uspa_lastik: 0.95,
    unver: 1,
    yilkarlas: 0.97
};

// Kaynak kodu site ekiyle de gelebilir (ör. "mollaoglu_xml_lastikjantavm"); iki site aynı çarpanı kullanır.
function netMaliyetCarpani(sourceCode) {
    // Acil kapatma: XML_NET_MALIYET_SECIMI=false ise eski davranış (ham fiyata göre seçim)
    if (process.env.XML_NET_MALIYET_SECIMI === 'false') return 1;
    const kod = String(sourceCode || '').replace(/_lastikjantavm$/, '');
    const c = CARPANLAR[kod];
    return typeof c === 'number' && c > 0 ? c : 1;
}

module.exports = { CARPANLAR, netMaliyetCarpani };
