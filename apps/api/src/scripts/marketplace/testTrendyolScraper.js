// Trendyol Mağaza Scraper Test Scripti
// Çalıştırma: node apps/api/src/scripts/testTrendyolScraper.js
// Veya görsel olarak: HEADLESS=false node apps/api/src/scripts/testTrendyolScraper.js

const { chromium } = require('playwright-extra');
const stealth = require('puppeteer-extra-plugin-stealth')();

chromium.use(stealth);

const TEST_URL = 'https://www.trendyol.com/magaza/a-lastik-m-885697?sst=0&channelId=1';
const HEADLESS = process.env.HEADLESS !== 'false';

async function scrapeTrendyolStore(url) {
    console.log('='.repeat(70));
    console.log('Trendyol Mağaza Scraper Test');
    console.log('='.repeat(70));
    console.log(`URL: ${url}`);
    console.log(`Headless: ${HEADLESS}`);
    console.log('-'.repeat(70));

    const browser = await chromium.launch({
        headless: HEADLESS,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-blink-features=AutomationControlled',
            '--disable-dev-shm-usage'
        ]
    });

    const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        viewport: { width: 1920, height: 1080 },
        locale: 'tr-TR',
        timezoneId: 'Europe/Istanbul'
    });

    const page = await context.newPage();

    try {
        console.log('\n[1/4] Sayfa yükleniyor...');
        const startTime = Date.now();

        await page.goto(url, {
            waitUntil: 'domcontentloaded',
            timeout: 60000
        });

        const loadTime = ((Date.now() - startTime) / 1000).toFixed(2);
        console.log(`Sayfa yüklendi (${loadTime}s)`);

        console.log('\n[2/4] Bot koruması kontrol ediliyor...');
        const pageTitle = await page.title();
        console.log(`Sayfa Başlığı: ${pageTitle}`);

        const isBotBlocked = pageTitle.toLowerCase().includes('captcha') ||
            pageTitle.toLowerCase().includes('blocked') ||
            pageTitle.toLowerCase().includes('robot');

        if (isBotBlocked) {
            console.log('UYARI: Bot koruması algılandı, sayfa engellendi.');
            await page.screenshot({ path: '/tmp/trendyol-blocked.png', fullPage: true });
            console.log('Screenshot: /tmp/trendyol-blocked.png');
            await browser.close();
            return null;
        }

        console.log('Bot koruması yok, devam ediliyor.');

        console.log('\n[3/4] İçerik render bekleniyor (5sn)...');
        await page.waitForTimeout(5000);

        await page.screenshot({ path: '/tmp/trendyol-test.png', fullPage: true });
        console.log('Screenshot kaydedildi: /tmp/trendyol-test.png');

        const htmlPath = '/tmp/trendyol-test.html';
        const html = await page.content();
        require('fs').writeFileSync(htmlPath, html);
        console.log(`HTML kaydedildi: ${htmlPath} (${(html.length / 1024).toFixed(1)} KB)`);

        console.log('\n[4/4] Veriler çekiliyor...');
        console.log('-'.repeat(70));

        const data = await page.evaluate(() => {
            const result = {
                storeName: null,
                rating: null,
                followerCount: null,
                followerRaw: null,
                debugMatches: {}
            };

            const h1 = document.querySelector('h1');
            if (h1) {
                result.storeName = h1.textContent.trim();
                result.debugMatches.storeName = 'h1';
            }

            const bodyText = document.body.innerText;

            if (result.storeName) {
                const escapedName = result.storeName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                const ratingRegex = new RegExp(`${escapedName}\\s*[\\n\\r]?\\s*(\\d+[.,]\\d+)`, 'i');
                const ratingMatch = bodyText.match(ratingRegex);
                if (ratingMatch) {
                    result.rating = parseFloat(ratingMatch[1].replace(',', '.'));
                    result.debugMatches.rating = `Mağaza adı sonrası → "${ratingMatch[0]}"`;
                }
            }

            const followerRegex = /([\d.,]+)\s*([BMKbmk])?\s*Takip[çc]i/i;
            const followerMatch = bodyText.match(followerRegex);
            if (followerMatch) {
                result.followerRaw = followerMatch[0];
                const numStr = followerMatch[1].replace(',', '.');
                const num = parseFloat(numStr);
                const suffix = (followerMatch[2] || '').toUpperCase();

                let multiplier = 1;
                if (suffix === 'B' || suffix === 'K') multiplier = 1000;
                else if (suffix === 'M') multiplier = 1000000;

                result.followerCount = Math.round(num * multiplier);
                result.debugMatches.followerCount = `"${followerMatch[0]}" → ${result.followerCount}`;
            }

            result.bodyTextSample = bodyText.substring(0, 1500);

            return result;
        });

        console.log('\nÇEKİLEN VERİLER:');
        console.log('-'.repeat(70));
        console.log(`Mağaza Adı       : ${data.storeName || 'BULUNAMADI'}`);
        console.log(`Puan             : ${data.rating !== null ? data.rating : 'BULUNAMADI'}`);
        console.log(`Takipçi (sayı)   : ${data.followerCount !== null ? data.followerCount.toLocaleString('tr-TR') : 'BULUNAMADI'}`);
        console.log(`Takipçi (ham)    : ${data.followerRaw || 'BULUNAMADI'}`);
        console.log(`Değerlendirme    : MAĞAZA SAYFASINDA YOK (ürün bazlı)`);

        console.log('\nDEBUG - Eşleşmeler:');
        console.log('-'.repeat(70));
        Object.entries(data.debugMatches).forEach(([key, value]) => {
            console.log(`${key}: ${value}`);
        });

        console.log('\nSAYFA METNİ ÖRNEĞİ (ilk 2000 karakter):');
        console.log('-'.repeat(70));
        console.log(data.bodyTextSample);

        console.log('\n' + '='.repeat(70));
        console.log('Test Tamamlandı.');
        console.log('='.repeat(70));

        return data;
    } catch (err) {
        console.error('\nHATA:', err.message);
        try {
            await page.screenshot({ path: '/tmp/trendyol-error.png', fullPage: true });
            console.log('Hata anı screenshot: /tmp/trendyol-error.png');
        } catch (_) { }
        return null;
    } finally {
        await browser.close();
    }
}

(async () => {
    await scrapeTrendyolStore(TEST_URL);
    process.exit(0);
})();