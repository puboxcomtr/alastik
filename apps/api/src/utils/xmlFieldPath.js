function getXmlFieldValue(obj, path) {
    if (!path) return null;

    const parts = String(path).match(/[^.\[\]]+/g) || [];
    let current = obj;

    for (const part of parts) {
        if (current === null || current === undefined) return null;

        const separatorIndex = part.indexOf('=');
        if (separatorIndex > 0) {
            const fieldName = part.slice(0, separatorIndex).trim();
            const fieldValue = part.slice(separatorIndex + 1).trim();
            const items = Array.isArray(current) ? current : [current];
            current = items.find(item =>
                item !== null &&
                typeof item === 'object' &&
                String(item[fieldName] ?? '').trim() === fieldValue
            );
            continue;
        }

        current = current[part];
    }

    return current === undefined ? null : current;
}

module.exports = { getXmlFieldValue };
