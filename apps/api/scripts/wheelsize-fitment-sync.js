const path = require('path');
const API_DIR = path.resolve(__dirname, '..');
const envFile = process.env.NODE_ENV === 'production' || require('fs').existsSync(path.join(API_DIR, '.env.production'))
    ? '.env.production' : '.env.local';
require('dotenv').config({ path: path.join(API_DIR, envFile) });
const axios = require('axios');
const mongoose = require('mongoose');
const WheelSizeService = require('../src/services/plugins/wheelsize/WheelSizeService');
const WebVehicleFitment = require('../src/models/web/catalog/WebVehicleFitment');

const args = process.argv.slice(2);
const opt = (name, def) => {
    const a = args.find(x => x.startsWith(`--${name}=`));
    return a ? a.split('=').slice(1).join('=') : def;
};
const APPLY = args.includes('--apply');
const FORCE = args.includes('--force');
const ONLY_MAKES = (opt('make', '') || '').split(',').map(s => s.trim()).filter(Boolean);
const MIN_YEAR = parseInt(opt('min-year', '2000'), 10);
const DELAY = parseInt(opt('delay', '350'), 10);
const FRESH_DAYS = 20;
const REGION = 'eudm';

const EXCLUDED = ['samsung', 'korea', 'trucks', 'commercial', 'alpina', 'amg', 'brabus', 'carlsson', 'russia', 'india', 'china'];

const sleep = ms => new Promise(r => setTimeout(r, ms));
let requestCount = 0;

async function ws(endpoint, params) {
    for (let attempt = 1; attempt <= 5; attempt++) {
        try {
            await sleep(DELAY);
            requestCount++;
            const res = await axios.get(`${WheelSizeService.baseURL}${endpoint}`, {
                params: { user_key: WheelSizeService.userKey, ...params },
                timeout: 20000
            });
            return res.data?.data ?? res.data;
        } catch (e) {
            const status = e.response?.status;
            if (status === 429 || status >= 500 || !status) {
                const wait = status === 429 ? 60000 * attempt : 5000 * attempt;
                console.warn(`  ! ${endpoint} ${JSON.stringify(params)} → ${status || e.code}; ${wait / 1000} sn sonra tekrar (${attempt}/5)`);
                await sleep(wait);
                continue;
            }
            throw new Error(`${endpoint} ${JSON.stringify(params)} → HTTP ${status}: ${JSON.stringify(e.response?.data).slice(0, 200)}`);
        }
    }
    throw new Error(`${endpoint} ${JSON.stringify(params)} → 5 denemede alınamadı`);
}

const num = v => (v === null || v === undefined || v === '' || isNaN(Number(v)) ? undefined : Number(v));

function mapTire(t) {
    if (!t || !t.tire) return null;
    const bar = t.tire_pressure?.bar ?? t.tire_pressure?.front?.bar ?? (typeof t.tire_pressure === 'number' ? t.tire_pressure : undefined);
    return {
        tire: t.tire,
        tireFull: t.tire_full || undefined,
        width: num(t.tire_width),
        aspect: num(t.tire_aspect_ratio),
        diameter: num(t.rim_diameter),
        loadIndex: num(t.load_index),
        speedIndex: t.speed_index || undefined,
        rim: t.rim || undefined,
        rimWidth: num(t.rim_width),
        rimOffset: num(t.rim_offset),
        pressureBar: num(bar)
    };
}

function mapModification(m) {
    const tech = m.technical || {};
    return {
        slug: m.slug,
        trim: m.trim || m.name,
        startYear: num(m.start_year),
        endYear: num(m.end_year),
        fuel: m.engine?.fuel || m.powertrain?.primary_fuel?.title || undefined,
        powerHp: num(m.engine?.power?.hp ?? m.powertrain?.system_power?.hp),
        engineCode: m.engine?.code || undefined,
        tireType: m.tire_type || undefined,
        boltPattern: tech.bolt_pattern && tech.bolt_pattern !== 'N/A' ? tech.bolt_pattern : undefined,
        studHoles: num(tech.stud_holes),
        pcd: num(tech.pcd),
        centreBore: num(tech.centre_bore),
        threadSize: tech.wheel_fasteners?.thread_size || undefined,
        fastenerType: tech.wheel_fasteners?.type || undefined,
        wheels: (m.wheels || []).map(w => ({
            oe: !!w.is_stock,
            winter: !!w.is_recommended_for_winter,
            runflat: !!w.is_runflat_tires,
            steel: !!w.is_pressed_steel_rims,
            front: mapTire(w.front),
            rear: w.showing_fp_only ? null : mapTire(w.rear)
        })).filter(w => w.front)
    };
}

function summarize(generations) {
    const count = (map, key) => { if (key) map.set(key, (map.get(key) || 0) + 1); };
    const oe = new Map(), opt = new Map(), rims = new Set(), bolts = new Set(), bores = new Set(), fuels = new Set(), bodies = new Set();
    let from = Infinity, to = -Infinity, mods = 0;
    for (const g of generations) {
        g.bodies.forEach(b => bodies.add(b));
        for (const m of g.modifications) {
            mods++;
            if (m.startYear) from = Math.min(from, m.startYear);
            if (m.endYear) to = Math.max(to, m.endYear);
            if (m.boltPattern) bolts.add(m.boltPattern);
            if (m.centreBore) bores.add(m.centreBore);
            if (m.fuel) fuels.add(m.fuel);
            for (const w of m.wheels) {
                for (const t of [w.front, w.rear]) {
                    if (!t) continue;
                    count(w.oe ? oe : opt, t.tire);
                    if (t.diameter) rims.add(t.diameter);
                }
            }
        }
    }
    const sorted = map => [...map.entries()].sort((a, b) => b[1] - a[1]).map(([k]) => k);
    const oeSizes = sorted(oe);
    return {
        yearFrom: isFinite(from) ? from : undefined,
        yearTo: isFinite(to) ? to : undefined,
        oeTireSizes: oeSizes,
        optionalTireSizes: sorted(opt).filter(s => !oeSizes.includes(s)),
        rimDiameters: [...rims].sort((a, b) => a - b),
        boltPatterns: [...bolts],
        centreBores: [...bores].sort((a, b) => a - b),
        fuels: [...fuels],
        bodies: [...bodies],
        modificationCount: mods
    };
}

const modelIsRecent = m => (m.year_ranges || []).some(r => {
    const end = parseInt(String(r).split('-').pop(), 10);
    return !isNaN(end) && end >= MIN_YEAR;
});

(async () => {
    console.log(`Wheel-Size senkronu — ${APPLY ? 'YAZMA' : 'KURU ÇALIŞTIRMA'} | bölge ${REGION} | ${MIN_YEAR}+ | istek arası ${DELAY} ms`);
    let makes = (await ws('/makes/', { region: REGION }))
        .filter(m => !EXCLUDED.some(k => m.slug.toLowerCase().includes(k) || m.name.toLowerCase().includes(k)));
    if (ONLY_MAKES.length) makes = makes.filter(m => ONLY_MAKES.includes(m.slug));
    console.log(`Marka: ${makes.length}`);

    if (!APPLY) {
        let models = 0;
        for (const make of makes) {
            const list = (await ws('/models/', { make: make.slug, region: REGION })).filter(modelIsRecent);
            models += list.length;
            console.log(`  ${make.name.padEnd(22)} ${list.length} model`);
        }
        console.log(`\nToplam ${models} model. Tahmini istek: ~${Math.round(models * 4.5)} (model başına nesil listesi + nesil başına veri).`);
        console.log(`Tahmini süre: ~${Math.round(models * 4.5 * (DELAY + 250) / 60000)} dk. Kuru çalıştırma: hiçbir şey yazılmadı.`);
        return;
    }

    await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10000 });
    await WebVehicleFitment.init();
    const freshSince = new Date(Date.now() - FRESH_DAYS * 864e5);
    let saved = 0, skipped = 0, failed = 0;

    for (const [mi, make] of makes.entries()) {
        let models;
        try {
            models = (await ws('/models/', { make: make.slug, region: REGION })).filter(modelIsRecent);
        } catch (e) { console.error(`HATA ${make.slug}: ${e.message}`); failed++; continue; }
        console.log(`[${mi + 1}/${makes.length}] ${make.name}: ${models.length} model`);

        for (const model of models) {
            if (!FORCE) {
                const existing = await WebVehicleFitment.findOne({ makeSlug: make.slug, modelSlug: model.slug }, { syncedAt: 1 }).lean();
                if (existing?.syncedAt && existing.syncedAt > freshSince) { skipped++; continue; }
            }
            try {
                const gens = (await ws('/generations/', { make: make.slug, model: model.slug }))
                    .filter(g => !g.end || g.end >= MIN_YEAR);
                const generations = [];
                for (const g of gens) {
                    const mods = await ws('/search/by_model/', { make: make.slug, model: model.slug, generation: g.slug, region: REGION });
                    const modifications = (mods || []).map(mapModification).filter(m => m.wheels.length);
                    if (!modifications.length) continue;
                    generations.push({
                        slug: g.slug,
                        name: g.name,
                        platform: g.platform || undefined,
                        start: num(g.start),
                        end: num(g.end),
                        bodies: (g.bodies || []).map(b => b.name).filter(Boolean),
                        modifications
                    });
                }
                if (!generations.length) { skipped++; continue; }
                await WebVehicleFitment.findOneAndUpdate(
                    { makeSlug: make.slug, modelSlug: model.slug },
                    {
                        makeSlug: make.slug, makeName: make.name,
                        modelSlug: model.slug, modelName: model.name,
                        generations, summary: summarize(generations),
                        source: `wheel-size.com/${REGION}`, syncedAt: new Date()
                    },
                    { upsert: true, new: true, setDefaultsOnInsert: true }
                );
                saved++;
                console.log(`    ✓ ${make.name} ${model.name}: ${generations.length} nesil`);
            } catch (e) {
                failed++;
                console.error(`    HATA ${make.slug}/${model.slug}: ${e.message}`);
            }
        }
    }
    console.log(`\nBitti. Kaydedilen: ${saved}, atlanan (yeni/verisiz): ${skipped}, hatalı: ${failed}, Wheel-Size isteği: ${requestCount}`);
    console.log(`vehiclefitments toplam kayıt: ${await WebVehicleFitment.countDocuments()}`);
})()
    .catch(e => { console.error('DURDU:', e.message); process.exitCode = 1; })
    .finally(() => mongoose.connection.readyState && mongoose.disconnect());
