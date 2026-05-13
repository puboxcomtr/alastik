import { Metadata } from 'next';
import TireCalcView from '@/src/components/calculator/TireCalcView';

export const metadata: Metadata = {
    title: 'Jant Lastik Hesaplama Modülü | ALastik.com',
    description: 'Mevcut lastik ebatınızla karşılaştırmak istediğiniz lastik ebatını giriniz. Çap farkı, hız sapması ve uyumluluk durumunu anında öğrenin.',
    keywords: 'jant lastik hesaplama, lastik ebat karşılaştırma, lastik çap hesaplama, lastik uyumluluk'
};

export default function TireCalcPage() {
    return <TireCalcView />;
}