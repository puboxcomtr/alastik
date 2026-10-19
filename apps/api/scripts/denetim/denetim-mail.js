require('/var/www/alastik/node_modules/dotenv').config({ path: '/var/www/alastik/apps/api/.env.production' });
process.chdir('/var/www/alastik/apps/api');
const fs = require('fs');
const mongoose = require('/var/www/alastik/apps/api/node_modules/mongoose');

const [, , raporDosyasi, konu, alici, site = 'alastik'] = process.argv;
if (!raporDosyasi || !konu || !alici) {
    console.error('Kullanım: node denetim-mail.js <raporDosyasi> <konu> <alici> [site]');
    process.exit(1);
}

function escapeHtml(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

(async () => {
    const icerik = fs.readFileSync(raporDosyasi, 'utf8');
    await mongoose.connect(process.env.MONGODB_URI);
    const MailService = require('/var/www/alastik/apps/api/src/services/web/mail/MailService');

    await MailService.sendMail({
        to: alici,
        subject: konu,
        text: icerik,
        html: `<pre style="font-family:Consolas,Menlo,monospace;font-size:13px;white-space:pre-wrap">${escapeHtml(icerik)}</pre>`,
        site
    });

    console.log(`Rapor gönderildi: ${alici} (${raporDosyasi}, site: ${site})`);
    await mongoose.disconnect();
    process.exit(0);
})().catch((e) => { console.error('Mail gönderim hatası:', e.message); process.exit(1); });
