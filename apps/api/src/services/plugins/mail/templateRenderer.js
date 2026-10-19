const nunjucks = require('nunjucks')

const env = new nunjucks.Environment(null, {
    autoescape: false,
    throwOnUndefined: false,
    trimBlocks: false,
    lstripBlocks: false
})

env.addFilter('date', function (input, format) {
    if (!input) return ''

    const date = new Date(input)

    if (isNaN(date.getTime())) return input

    const tzParts = new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Europe/Istanbul',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
    }).formatToParts(date)

    const get = (type) => tzParts.find(p => p.type === type)?.value || ''

    const replacements = {
        'd': get('day'),
        'm': get('month'),
        'Y': get('year'),
        'H': get('hour') === '24' ? '00' : get('hour'),
        'i': get('minute'),
        's': get('second')
    }

    if (!format) return `${replacements.d}.${replacements.m}.${replacements.Y} ${replacements.H}:${replacements.i}`

    return format.replace(/d|m|Y|H|i|s/g, (m) => replacements[m] || m)
})

env.addFilter('raw', function (input) {
    return input
})

const twigToNunjucks = (template) => {
    if (!template) return ''

    let result = template

    result = result.replace(/<!--\[if[\s\S]*?\]>[\s\S]*?<!\[endif\]-->/g, '')
    result = result.replace(/<!--\[if[\s\S]*?\]>/g, '')
    result = result.replace(/<!\[endif\]-->/g, '')
    result = result.replace(/(\{\{[^}]*?)\s*~\s*([^}]*?\}\})/g, '$1 + $2')
    result = result.replace(/sharedAsset\(\s*['"]([^'"]+)['"]\s*\)/g, "'/assets/$1'")
    result = result.replace(/(\w+(?:\.\w+)*)\s+is\s+even/g, '($1 % 2 === 0)')
    result = result.replace(/(\w+(?:\.\w+)*)\s+is\s+odd/g, '($1 % 2 !== 0)')

    return result
}

const render = (template, data) => {
    try {
        const cleanTemplate = twigToNunjucks(template)

        const ifCount = (cleanTemplate.match(/\{%\s*if\s/g) || []).length
        const endifCount = (cleanTemplate.match(/\{%\s*endif\s*%\}/g) || []).length
        const forCount = (cleanTemplate.match(/\{%\s*for\s/g) || []).length
        const endforCount = (cleanTemplate.match(/\{%\s*endfor\s*%\}/g) || []).length

        console.log(`[templateRenderer] if: ${ifCount}/${endifCount}, for: ${forCount}/${endforCount}`)

        return env.renderString(cleanTemplate, data || {})
    } catch (error) {
        console.error('[templateRenderer] Render hatası FULL:', error)
        console.error('[templateRenderer] Stack:', error.stack)
        throw new Error(`Render hatası: ${error.message || error.toString()}`)
    }
}

module.exports = { render }