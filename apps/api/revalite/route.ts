import { revalidateTag } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
    try {
        const secret = request.headers.get('x-revalidate-secret');

        if (secret !== process.env.REVALIDATE_SECRET) {
            return NextResponse.json(
                { success: false, message: 'Yetkisiz istek' },
                { status: 401 }
            );
        }

        const body = await request.json();
        const { tag } = body;

        if (!tag) {
            return NextResponse.json(
                { success: false, message: 'Tag parametresi gerekli' },
                { status: 400 }
            );
        }

        revalidateTag(tag);

        return NextResponse.json({
            success: true,
            message: `Cache temizlendi: ${tag}`,
            revalidated: true,
            now: Date.now()
        });
    } catch (error) {
        console.error('[Revalidate] Hata:', error);
        return NextResponse.json(
            { success: false, message: 'Cache temizleme hatası' },
            { status: 500 }
        );
    }
}