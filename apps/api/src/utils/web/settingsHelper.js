const Setting = require('../../models/admin/settings/Setting');

class SettingsHelper {
    static async getSetting(group, key) {
        const setting = await Setting.findOne({ group, key });
        return setting ? setting.value : null;
    }

    static async checkMemberSettings() {
        const newMember = await this.getSetting('member', 'newMember');
        const controlMember = await this.getSetting('member', 'controlMember');
        const memberActivation = await this.getSetting('member', 'memberActivation');

        return {
            newMember: newMember === true || newMember === 'true',
            controlMember: controlMember === true || controlMember === 'true',
            memberActivation: memberActivation || 'admin'
        };
    }
}

module.exports = SettingsHelper;