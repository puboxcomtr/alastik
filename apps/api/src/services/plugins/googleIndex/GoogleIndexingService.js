const { google } = require('googleapis');
const path = require('path');

const KEY_FILE = path.join(__dirname, '../../../config/alastik-service-account.json');
const SCOPES = ['https://www.googleapis.com/auth/indexing'];
const SITE_URL = 'https://alastik.com';

const INDEXABLE_PATHS = {
    urun: '/urun/',
    marka: '/marka/',
    kategori: '/kategori/',
    etiket: '/etiket/'
};

async function getAuthClient() {
    const auth = new google.auth.GoogleAuth({
        keyFile: KEY_FILE,
        scopes: SCOPES
    });
    return auth.getClient();
}

async function notifyUrl(url, type = 'URL_UPDATED') {
    try {
        const authClient = await getAuthClient();
        const indexing = google.indexing({ version: 'v3', auth: authClient });

        const res = await indexing.urlNotifications.publish({
            requestBody: { url, type }
        });

        return { success: true, url, status: res.status };
    } catch (err) {
        return { success: false, url, error: err.message };
    }
}

async function notifyBatch(urls, type = 'URL_UPDATED') {
    const results = [];
    for (const url of urls) {
        const result = await notifyUrl(url, type);
        results.push(result);
        await new Promise(r => setTimeout(r, 50));
    }
    return results;
}

function buildUrl(type, slug) {
    const basePath = INDEXABLE_PATHS[type];
    if (!basePath) throw new Error(`Geçersiz tip: ${type}`);
    return `${SITE_URL}${basePath}${slug}`;
}

module.exports = { notifyUrl, notifyBatch, buildUrl, INDEXABLE_PATHS };