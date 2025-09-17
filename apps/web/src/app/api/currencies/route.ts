import { NextRequest, NextResponse } from 'next/server';

// Currency data
const currencies = [
  {
    id: 'TRY',
    name: 'Türk Lirası',
    symbol: '₺',
    code: 'TRY',
    rate: 1,
    isDefault: true
  },
  {
    id: 'USD',
    name: 'US Dollar',
    symbol: '$',
    code: 'USD',
    rate: 0.031,
    isDefault: false
  },
  {
    id: 'EUR',
    name: 'Euro',
    symbol: '€',
    code: 'EUR',
    rate: 0.029,
    isDefault: false
  }
];

export async function GET() {
  try {
    return NextResponse.json({
      success: true,
      data: currencies
    });
  } catch {
    return NextResponse.json(
      { 
        success: false, 
        error: 'Currency verisi alınamadı' 
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Yeni currency ekleme logic'i buraya gelecek
    // Şimdilik basit bir response dönüyoruz
    
    return NextResponse.json({
      success: true,
      message: 'Currency başarıyla eklendi',
      data: body
    });
  } catch {
    return NextResponse.json(
      { 
        success: false, 
        error: 'Currency eklenirken hata oluştu' 
      },
      { status: 500 }
    );
  }
} 