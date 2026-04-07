const axios = require('axios');
const fs = require('fs');
const path = require('path');

const USER_KEY = process.env.WHEEL_SIZE_USER_KEY || 'd53fc3695c85571775540c1c9a3ac8c5';
const BASE = 'https://api.wheel-size.com/v2';
const REGION = 'eudm';
const DELAY = 400;

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const get = async (endpoint, params = {}) => {
    try {
        const res = await axios.get(`${BASE}${endpoint}`, {
            params: { user_key: USER_KEY, region: REGION, ...params },
            timeout: 15000
        });
        return { ok: true, data: res.data?.data || [] };
    } catch (e) {
        console.error(`  [HATA] ${endpoint} - ${e.response?.status} - ${e.message}`);
        return { ok: false, data: [] };
    }
};

// TEST: sadece ford
const TEST_MAKE = 'ford';

(async () => {
    console.log('Tarama basliyor...\n');
    const problems = [];

    const { data: makes } = await get('/makes/');
    const testMakes = makes.filter(m => m.slug === TEST_MAKE);
    console.log(`Test marka: ${testMakes.length}\n`);

    for (const make of testMakes) {
        process.stdout.write(`${make.name} taranıyor...\n`);
        await sleep(DELAY);

        const { data: models } = await get('/models/', { make: make.slug });
        process.stdout.write(` ${models.length} model\n`);

        for (const model of models) {
            await sleep(DELAY);
            const { ok: genOk, data: generations } = await get('/generations/', { make: make.slug, model: model.slug });
            if (!genOk) continue;

            if (generations.length === 0) {
                await sleep(DELAY);
                const { data: years } = await get('/years/', { make: make.slug, model: model.slug });
                problems.push({
                    sorun: 'generations_bos',
                    marka: make.name,
                    marka_slug: make.slug,
                    model: model.name,
                    model_slug: model.slug,
                    yillar: years.map(y => y.slug)
                });
                console.log(`  [SORUN] ${make.name} ${model.name} - generations bos`);
                continue;
            }

            for (const gen of generations) {
                const testYears = gen.years?.length > 0 ? gen.years : [gen.end || gen.start];
                let found = false;

                for (const testYear of testYears) {
                    await sleep(DELAY);
                    const { ok: modOk, data: mods } = await get('/modifications/', { make: make.slug, model: model.slug, year: testYear });
                    if (!modOk) continue;
                    if (mods.length > 0) { found = true; break; }
                }

                if (!found) {
                    problems.push({
                        sorun: 'modifications_bos',
                        marka: make.name,
                        marka_slug: make.slug,
                        model: model.name,
                        model_slug: model.slug,
                        generation: gen.name,
                        tum_yillar: gen.years
                    });
                    console.log(`  [SORUN] ${make.name} ${model.name} - ${gen.name} modifications bos`);
                }
            }
        }
    }

    const outputPath = path.join(__dirname, 'sorunlu_araclar.json');
    fs.writeFileSync(outputPath, JSON.stringify(problems, null, 2));

    console.log(`\n=== TARAMA TAMAMLANDI ===`);
    console.log(`Toplam sorun: ${problems.length}`);
    console.log(`Generations bos: ${problems.filter(p => p.sorun === 'generations_bos').length}`);
    console.log(`Modifications bos: ${problems.filter(p => p.sorun === 'modifications_bos').length}`);
    console.log(`Sonuclar: ${outputPath}`);
})();