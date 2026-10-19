const CARPANLAR = {
    aslan_kardesler_lastik_xml: 1.20,
    dincbay: 1,
    guler_lastik: 0.95,
    keskin_lastik: 0.93,
    lastikistan_xml_format: 0.93,
    mollaoglu_xml: 0.93,
    simetri: 0.93,
    ozkan_lastik: 1,
    polat_lastik: 0.96,
    uspa_lastik: 0.95,
    unver: 1,
    yilkarlas: 0.97
};

function netMaliyetCarpani(sourceCode) {
    if (process.env.XML_NET_MALIYET_SECIMI === 'false') return 1;
    const kod = String(sourceCode || '').replace(/_lastikjantavm$/, '');
    const c = CARPANLAR[kod];
    return typeof c === 'number' && c > 0 ? c : 1;
}

module.exports = { CARPANLAR, netMaliyetCarpani };
