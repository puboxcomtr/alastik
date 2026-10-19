const mongoose = require('mongoose');

const counterId = (site) => `cargoNo:${site}`;

async function reserveCargoNos(site, count = 1) {
    const counters = mongoose.connection.db.collection('counters');
    const exists = await counters.findOne({ _id: counterId(site) }, { projection: { _id: 1 } });
    if (!exists) {
        const Cargo = mongoose.model('Cargo');
        const top = await Cargo.findOne({ site, cargoNo: { $type: 'number' } }).sort({ cargoNo: -1 }).select('cargoNo').lean();
        await counters.updateOne({ _id: counterId(site) }, { $setOnInsert: { seq: top?.cargoNo || 0 } }, { upsert: true });
    }
    const res = await counters.findOneAndUpdate({ _id: counterId(site) }, { $inc: { seq: count } }, { returnDocument: 'after' });
    const doc = res && res.value !== undefined ? res.value : res;
    return doc.seq - count + 1;
}

async function assignMissingCargoNos(site) {
    const Cargo = mongoose.model('Cargo');
    const missing = await Cargo.find({ site, cargoNo: { $exists: false } }).sort({ createdAt: 1, _id: 1 }).select('_id').lean();
    let assigned = 0;
    for (const item of missing) {
        const cargoNo = await reserveCargoNos(site, 1);
        const r = await Cargo.updateOne({ _id: item._id, cargoNo: { $exists: false } }, { $set: { cargoNo } });
        assigned += r.modifiedCount;
    }
    return assigned;
}

module.exports = { reserveCargoNos, assignMissingCargoNos };
