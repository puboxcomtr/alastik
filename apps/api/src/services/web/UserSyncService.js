const User = require('../../models/User');
const crypto = require('crypto');

class UserSyncService {
    
    /**
     * DIA müşteri bilgisinden User oluştur/güncelle
     * @param {Object} diaCustomerData - DIA'dan gelen müşteri bilgisi
     * @returns {Promise<Object>} - User document ve adres/garaj ID'leri
     */
    async createOrUpdateUserFromDia(diaCustomerData) {
        try {
            const {
                _key_scf_carikart, // DIA müşteri key
                __cariunvan,       // Ad soyad
                __cariceptel,      // Telefon
                __cariverginumarasi, // Vergi no
                sevkadresi1,       // Adres satır 1
                sevkadresi2,       // Adres satır 2 (ilçe)
                sevkadresi3        // Adres satır 3 (şehir)
            } = diaCustomerData;

            // İsim parse et
            const nameParts = (__cariunvan || '').trim().split(' ');
            const firstName = nameParts[0] || 'Müşteri';
            const lastName = nameParts.slice(1).join(' ') || '';

            // Email oluştur (DIA'da email yok, dummy oluştur)
            const emailDomain = '@dia-customer.alastik.com';
            const emailPrefix = `customer-${_key_scf_carikart}`;
            const email = `${emailPrefix}${emailDomain}`;

            // Telefonu temizle
            const cleanPhone = (__cariceptel || '').replace(/\D/g, '');

            // Var mı kontrol et
            let user = await User.findOne({ diaKey: _key_scf_carikart });

            if (user) {
                console.log(`✅ Mevcut user bulundu: ${user._id}`);
                return {
                    user,
                    isNew: false
                };
            }

            // Yeni user oluştur
            const randomPassword = crypto.randomBytes(16).toString('hex');

            user = new User({
                email,
                password: randomPassword, // Middleware hash'leyecek
                authProvider: 'local',
                username: `dia_${_key_scf_carikart}`,
                firstName,
                lastName,
                
                profile: {
                    firstName,
                    lastName,
                    phone: cleanPhone || null
                },
                
                accountStatus: 'active',
                isEmailVerified: false,
                isPhoneVerified: false,
                
                diaKey: _key_scf_carikart, // DIA key'i kaydet
                
                customerSegment: 'new',
                
                // Adres ekle
                addresses: [],
                garage: [],
                
                gdprConsent: {
                    given: false
                }
            });

            // Adresi ekle (eğer varsa)
            if (sevkadresi1) {
                const addressData = this.parseDiaAddress(
                    sevkadresi1, 
                    sevkadresi2, 
                    sevkadresi3,
                    firstName,
                    lastName,
                    cleanPhone
                );
                
                user.addresses.push(addressData);
            }

            await user.save();

            console.log(`🆕 Yeni user oluşturuldu: ${user._id}`);

            return {
                user,
                isNew: true
            };

        } catch (error) {
            console.error('User sync hatası:', error);
            throw error;
        }
    }

    /**
     * DIA adres verisini parse et
     */
    parseDiaAddress(sevkadresi1, sevkadresi2, sevkadresi3, firstName, lastName, phone) {
        // Şehir/İlçe parse et
        const cityDistrict = (sevkadresi3 || '').split('/');
        const district = cityDistrict[0]?.trim() || '';
        const city = cityDistrict[1]?.trim() || cityDistrict[0]?.trim() || '';

        return {
            type: 'other',
            title: 'DIA Adresi',
            firstName,
            lastName,
            phone: phone || '0000000000',
            address: sevkadresi1 || '',
            city: city || 'Belirtilmemiş',
            district: district || 'Belirtilmemiş',
            postalCode: '00000', // DIA'da posta kodu yok
            country: 'Turkey',
            isDefault: true,
            createdAt: new Date()
        };
    }
}

module.exports = UserSyncService;