import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url)
    const imageUrl = searchParams.get('url')

    if (!imageUrl) {
        return NextResponse.json({ error: 'URL parameter required' }, { status: 400 })
    }

    try {
        const response = await fetch(imageUrl, {
            headers: {
                'Accept': 'image/*'
            }
        })

        if (!response.ok) {
            throw new Error(`Failed to fetch image: ${response.status}`)
        }

        const blob = await response.blob()
        const arrayBuffer = await blob.arrayBuffer()

        return new NextResponse(arrayBuffer, {
            headers: {
                'Content-Type': response.headers.get('Content-Type') || 'image/jpeg',
                'Cache-Control': 'public, max-age=3600',
                'Access-Control-Allow-Origin': '*'
            }
        })
    } catch (error) {
        console.error('Proxy image error:', error)
        return NextResponse.json({ error: 'Failed to fetch image' }, { status: 500 })
    }
}