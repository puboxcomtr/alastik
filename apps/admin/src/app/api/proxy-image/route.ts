import { NextRequest, NextResponse } from 'next/server'

/**
 * Panelde görsel önizlemeleri bu uç üzerinden geçer.
 * Medya adresleri artık GÖRELİ geldiği için (/urun/..., /uploads/...) burada
 * medya sunucusuyla birleştirilir; yalnızca kendi sunucularımıza istek yapılır.
 */
const MEDIA_BASE = process.env.NEXT_PUBLIC_MEDIA_URL || 'http://127.0.0.1:3082'

const IZINLI_HOSTLAR = [
    process.env.NEXT_PUBLIC_MEDIA_URL,
    process.env.NEXT_PUBLIC_MEDIA_URL_ALASTIK,
    process.env.NEXT_PUBLIC_MEDIA_URL_LASTIKJANTAVM,
    'http://127.0.0.1:3082'
]
    .filter(Boolean)
    .map(u => {
        try { return new URL(u as string).host } catch { return '' }
    })
    .filter(Boolean)

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url)
    const imageUrl = searchParams.get('url')

    if (!imageUrl) {
        return NextResponse.json({ error: 'URL parametresi gerekli' }, { status: 400 })
    }

    // Göreli adres medya sunucusuyla tamamlanır
    const hedef = imageUrl.startsWith('http')
        ? imageUrl
        : `${MEDIA_BASE}${imageUrl.startsWith('/') ? imageUrl : `/${imageUrl}`}`

    let hedefUrl: URL

    try {
        hedefUrl = new URL(hedef)
    } catch {
        return NextResponse.json({ error: 'Geçersiz görsel adresi' }, { status: 400 })
    }

    // Açık yönlendirme/SSRF olmaması için yalnızca kendi medya sunucularımız
    if (!IZINLI_HOSTLAR.includes(hedefUrl.host)) {
        return NextResponse.json({ error: 'Bu adres için görsel getirilemez' }, { status: 400 })
    }

    try {
        const response = await fetch(hedefUrl.toString(), { headers: { Accept: 'image/*' } })

        if (!response.ok) {
            return NextResponse.json({ error: 'Görsel bulunamadı' }, { status: response.status })
        }

        const arrayBuffer = await response.arrayBuffer()

        return new NextResponse(arrayBuffer, {
            headers: {
                'Content-Type': response.headers.get('Content-Type') || 'image/jpeg',
                'Cache-Control': 'public, max-age=3600',
                'Access-Control-Allow-Origin': '*'
            }
        })
    } catch (error) {
        console.error('Görsel aracısı hatası:', error)

        return NextResponse.json({ error: 'Görsel getirilemedi' }, { status: 500 })
    }
}
