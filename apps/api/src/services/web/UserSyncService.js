const User = require('../../models/User');
const crypto = require('crypto');

class UserSyncService {
    
    async createOrUpdateUserFromDia(diaCustomerData) {
        try {
            const {
                _key_scf_carikart,
                __cariunvan,
                __cariceptel,
                __cariverginumarasi,
                sevkadresi1,
                sevkadresi2,
                sevkadresi3
            } = diaCustomerData;

            const nameParts = (__cariunvan || '').trim().split(' ');
            const firstName = nameParts[0] || 'Müşteri';
            const lastName = nameParts.slice(1).join(' ') || '';

            const emailDomain = '@dia-customer.alastik.com';
            const emailPrefix = `customer-${_key_scf_carikart}`;
            const email = `${emailPrefix}${emailDomain}`;

            const cleanPhone = (__cariceptel || '').replace(/\D/g, '');

            let user = await User.findOne({ diaKey: _key_scf_carikart });

            if (user) {
                console.log(`✅ Mevcut user bulundu: ${user._id}`);
                return {
                    user,
                    isNew: false
                };
            }

            const randomPassword = crypto.randomBytes(16).toString('hex');

            user = new User({
                email,
                password: randomPassword,
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
                
                diaKey: _key_scf_carikart,
                
                customerSegment: 'new',
                
                addresses: [],
                garage: [],
                
                gdprConsent: {
                    given: false
                }
            });

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

    parseDiaAddress(sevkadresi1, sevkadresi2, sevkadresi3, firstName, lastName, phone) {
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
            postalCode: '00000',
            country: 'Turkey',
            isDefault: true,
            createdAt: new Date()
        };
    }
}

module.exports = UserSyncService;