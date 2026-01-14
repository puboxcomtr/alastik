const mongoose = require('mongoose');
const axios = require('axios');

const AddressCity = require('../models/web/address/AddressCity');
const AddressDistrict = require('../models/web/address/AddressDistrict');
const AddressNeighborhood = require('../models/web/address/AddressNeighborhood');

const MONGODB_URI = 'mongodb://alastik:34gm4191M.@217.195.202.170:27017/alastik_db?authSource=admin';
const BASE_URL = 'https://raw.githubusercontent.com/metinyildirimnet/turkiye-adresler-json/refs/heads/main';

function turkishTitleCase(str) {
    if (!str) return str;
    
    const turkishLowerMap = {
        'İ': 'i', 'I': 'ı', 'Ğ': 'ğ', 'Ü': 'ü', 'Ş': 'ş', 'Ö': 'ö', 'Ç': 'ç'
    };
    const turkishUpperMap = {
        'i': 'İ', 'ı': 'I', 'ğ': 'Ğ', 'ü': 'Ü', 'ş': 'Ş', 'ö': 'Ö', 'ç': 'Ç'
    };
    
    let lower = '';
    for (const char of str) {
        lower += turkishLowerMap[char] || char.toLowerCase();
    }
    
    return lower.split(' ').map(word => {
        if (word.length === 0) return word;
        const firstChar = word.charAt(0);
        const upperFirst = turkishUpperMap[firstChar] || firstChar.toUpperCase();
        return upperFirst + word.slice(1);
    }).join(' ');
}

async function importLocations() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('MongoDB bağlantısı başarılı');

        console.log('Şehirler yükleniyor...');
        const citiesRes = await axios.get(`${BASE_URL}/sehirler.json`);
        const cities = citiesRes.data.map(c => ({
            cityId: c.sehir_id,
            cityName: turkishTitleCase(c.sehir_adi)
        }));
        await AddressCity.deleteMany({});
        await AddressCity.insertMany(cities);
        console.log(`${cities.length} şehir eklendi`);

        console.log('İlçeler yükleniyor...');
        const districtsRes = await axios.get(`${BASE_URL}/ilceler.json`);
        const districts = districtsRes.data.map(d => ({
            districtId: d.ilce_id,
            districtName: turkishTitleCase(d.ilce_adi),
            cityId: d.sehir_id
        }));
        await AddressDistrict.deleteMany({});
        await AddressDistrict.insertMany(districts);
        console.log(`${districts.length} ilçe eklendi`);

        console.log('Mahalleler yükleniyor...');
        await AddressNeighborhood.deleteMany({});

        for (let i = 1; i <= 4; i++) {
            console.log(`mahalleler-${i}.json yükleniyor...`);
            const res = await axios.get(`${BASE_URL}/mahalleler-${i}.json`);
            const neighborhoods = res.data
                .filter(n => n.mahalle_id && n.mahalle_adi)
                .map(n => ({
                    neighborhoodId: n.mahalle_id,
                    neighborhoodName: turkishTitleCase(n.mahalle_adi),
                    districtId: n.ilce_id,
                    cityId: n.sehir_id
                }));
            await AddressNeighborhood.insertMany(neighborhoods, { ordered: false }).catch(e => {
                if (e.code !== 11000) throw e;
                console.log(`  (${e.writeErrors?.length || 0} duplicate atlandı)`);
            });
            console.log(`${neighborhoods.length} mahalle eklendi`);
        }

        console.log('Import tamamlandı!');
        process.exit(0);
    } catch (error) {
        console.error('Hata:', error.message);
        process.exit(1);
    }
}

importLocations();