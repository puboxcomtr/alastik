import React from 'react';
import type { Metadata } from 'next';
import { headers } from 'next/headers';
import Contact from '@/src/components/contact/Contact';
import LastikJantAvmContact from '@/src/components/lastikjantavm/Contact/Main';

import { getOtherSeo } from '@/src/services/seoService';

export async function generateMetadata(): Promise<Metadata> {
    return await getOtherSeo('contact');
}
export default function ContactPage() {
    const site = headers().get('x-site') || 'alastik';
    if (site === 'lastikjantavm') {
        return <LastikJantAvmContact />;
    }
    return <Contact />;
}