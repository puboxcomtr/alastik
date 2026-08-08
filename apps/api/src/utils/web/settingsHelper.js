const Setting = require('../../models/admin/settings/Setting');

class SettingsHelper {
    static async getSetting(group, key, site) {
        const setting = await Setting.findOne({ group, key, ...(site ? { site } : {}) });
        return setting ? setting.value : null;
    }

    static async checkMemberSettings(site) {
        const newMember = await this.getSetting('member', 'newMember', site);
        const controlMember = await this.getSetting('member', 'controlMember', site);
        const memberActivation = await this.getSetting('member', 'memberActivation', site);

        return {
            newMember: newMember === true || newMember === 'true',
            controlMember: controlMember === true || controlMember === 'true',
            memberActivation: memberActivation || 'admin'
        };
    }
}

module.exports = SettingsHelper;