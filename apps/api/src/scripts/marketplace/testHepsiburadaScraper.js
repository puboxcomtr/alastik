// Hepsiburada Mağaza Scraper Test Scripti
// Çalıştırma: node apps/api/src/scripts/marketplace/testHepsiburadaScraper.js
// Görsel mod: HEADLESS=false node apps/api/src/scripts/marketplace/testHepsiburadaScraper.js

const { chromium } = require('playwright-extra');
const stealth = require('puppeteer-extra-plugin-stealth')();

chromium.use(stealth);

const TEST_URL = 'https://www.hepsiburada.com/magaza/a-lastik';
const HEADLESS = process.env.HEADLESS !== 'false';

async function scrapeHepsiburadaStore(url) {
    console.log('='.repeat(70));
    console.log('Hepsiburada Mağaza Scraper Test');
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
            pageTitle.toLowerCase().includes('robot') ||
            pageTitle.toLowerCase().includes('access denied');

        if (isBotBlocked) {
            console.log('UYARI: Bot koruması algılandı, sayfa engellendi.');
            await page.screenshot({ path: '/tmp/hepsiburada-blocked.png', fullPage: true });
            console.log('Screenshot: /tmp/hepsiburada-blocked.png');
            await browser.close();
            return null;
        }

        console.log('Bot koruması yok, devam ediliyor.');

        console.log('\n[3/4] İçerik render bekleniyor (5sn)...');
        await page.waitForTimeout(5000);

        await page.screenshot({ path: '/tmp/hepsiburada-test.png', fullPage: true });
        console.log('Screenshot kaydedildi: /tmp/hepsiburada-test.png');

        const htmlPath = '/tmp/hepsiburada-test.html';
        const html = await page.content();
        require('fs').writeFileSync(htmlPath, html);
        console.log(`HTML kaydedildi: ${htmlPath} (${(html.length / 1024).toFixed(1)} KB)`);

        console.log('\n[4/4] Veriler çekiliyor...');
        console.log('-'.repeat(70));

        const data = await page.evaluate(() => {
            const result = {
                storeName: null,
                rating: null,
                reviewCount: null,
                followerCount: null,
                followerRaw: null,
                ratingRaw: null,
                reviewRaw: null,
                debugMatches: {}
            };

            const h1 = document.querySelector('h1');
            if (h1) {
                result.storeName = h1.textContent.trim();
                result.debugMatches.storeName = 'h1';
            }

            const bodyText = document.body.innerText;

            // Hepsiburada puan formatı: mağaza adının hemen ardından "9,5" (max 10 üzerinden)
            // Sayfa metni örneği: "A Lastik\n9,5\n763 takipçi\n6B ürün"
            if (result.storeName) {
                const escapedName = result.storeName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                const ratingRegex = new RegExp(`${escapedName}[\\s\\S]{0,80}?(\\d+[.,]\\d+)\\s*[\\n\\r]?\\s*[\\d.,]+\\s*takip[çc]i`, 'i');
                const ratingMatch = bodyText.match(ratingRegex);
                if (ratingMatch) {
                    result.rating = parseFloat(ratingMatch[1].replace(',', '.'));
                    result.ratingRaw = ratingMatch[0].substring(0, 60);
                    result.debugMatches.rating = `Mağaza adı + takipçi arası → "${ratingMatch[1]}" = ${result.rating}`;
                }
            }

            if (result.rating === null) {
                const ratingRegex2 = /(\d+[.,]\d+)\s*\/\s*10/i;
                const m2 = bodyText.match(ratingRegex2);
                if (m2) {
                    result.rating = parseFloat(m2[1].replace(',', '.'));
                    result.ratingRaw = m2[0];
                    result.debugMatches.rating = `"${m2[0]}" → ${result.rating}`;
                }
            }

            if (result.rating === null) {
                const ratingRegex3 = /Mağaza\s*Puan[ıi]\s*[:\-]?\s*(\d+[.,]\d+)/i;
                const m3 = bodyText.match(ratingRegex3);
                if (m3) {
                    result.rating = parseFloat(m3[1].replace(',', '.'));
                    result.ratingRaw = m3[0];
                    result.debugMatches.rating = `"${m3[0]}" → ${result.rating}`;
                }
            }

            const reviewRegex = /(\d+(?:[.,]\d+)*)\s*De[ğg]erlendirme/i;
            const reviewMatch = bodyText.match(reviewRegex);
            if (reviewMatch) {
                result.reviewCount = parseInt(reviewMatch[1].replace(/[.,]/g, ''), 10);
                result.reviewRaw = reviewMatch[0];
                result.debugMatches.reviewCount = `"${reviewMatch[0]}" → ${result.reviewCount}`;
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

            result.bodyTextSample = bodyText.substring(0, 2000);

            return result;
        });

        console.log('\nÇEKİLEN VERİLER:');
        console.log('-'.repeat(70));
        console.log(`Mağaza Adı       : ${data.storeName || 'BULUNAMADI'}`);
        console.log(`Puan             : ${data.rating !== null ? data.rating : 'BULUNAMADI'} (ham: ${data.ratingRaw || '-'})`);
        console.log(`Değerlendirme    : ${data.reviewCount !== null ? data.reviewCount.toLocaleString('tr-TR') : 'BULUNAMADI'} (ham: ${data.reviewRaw || '-'})`);
        console.log(`Takipçi (sayı)   : ${data.followerCount !== null ? data.followerCount.toLocaleString('tr-TR') : 'BULUNAMADI'}`);
        console.log(`Takipçi (ham)    : ${data.followerRaw || 'BULUNAMADI'}`);

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
            await page.screenshot({ path: '/tmp/hepsiburada-error.png', fullPage: true });
            console.log('Hata anı screenshot: /tmp/hepsiburada-error.png');
        } catch (_) { }
        return null;
    } finally {
        await browser.close();
    }
}

(async () => {
    await scrapeHepsiburadaStore(TEST_URL);
    process.exit(0);
})();