const LABEL_IMAGE_PATTERN = /\/abetiketleri\//i;

function isLabelImage(image) {
    if (!image) return false;
    return LABEL_IMAGE_PATTERN.test(String(image.source_url || '')) ||
        LABEL_IMAGE_PATTERN.test(String(image.aws_url || ''));
}

function orderValue(image) {
    const parsed = parseInt(image?.order_id, 10);
    return Number.isNaN(parsed) ? Number.MAX_SAFE_INTEGER : parsed;
}

function moveLabelImagesLast(images) {
    if (!Array.isArray(images) || images.length < 2) return images;

    const labels = images.filter(isLabelImage);
    if (labels.length === 0 || labels.length === images.length) return images;

    const others = images
        .filter(img => !isLabelImage(img))
        .map((img, index) => ({ img, index }))
        .sort((a, b) => (orderValue(a.img) - orderValue(b.img)) || (a.index - b.index))
        .map(({ img }) => img);

    const ordered = [...others, ...labels];
    const unchanged = ordered.every((img, index) =>
        img === images[index] && String(img.order_id) === String(index + 1)
    );
    if (unchanged) return images;

    return ordered.map((img, index) => ({ ...img, order_id: String(index + 1) }));
}

async function reorderLabelImagesForAllProducts(WebProduct) {
    const collection = WebProduct.collection;
    const cursor = collection.find(
        { 'diaData.m_resimler.1': { $exists: true } },
        { projection: { _id: 1, 'diaData.m_resimler': 1 }, batchSize: 500 }
    );

    let scanned = 0;
    let updated = 0;
    let ops = [];

    const flush = async () => {
        if (ops.length === 0) return;
        const result = await collection.bulkWrite(ops, { ordered: false });
        updated += result.modifiedCount || 0;
        ops = [];
    };

    for await (const product of cursor) {
        scanned++;
        const images = product.diaData?.m_resimler || [];
        const reordered = moveLabelImagesLast(images);
        if (reordered === images) continue;

        ops.push({
            updateOne: {
                filter: { _id: product._id },
                update: { $set: { 'diaData.m_resimler': reordered } }
            }
        });
        if (ops.length >= 500) await flush();
    }
    await flush();

    return { scanned, updated };
}

module.exports = {
    LABEL_IMAGE_PATTERN,
    isLabelImage,
    moveLabelImagesLast,
    reorderLabelImagesForAllProducts
};
