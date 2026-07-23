import React from 'react';
import type { Metadata } from 'next';
import Contact from '@/src/components/contact/Contact';

import { getOtherSeo } from '@/src/services/seoService';

export async function generateMetadata(): Promise<Metadata> {
    return await getOtherSeo('contact');
}
export default function ContactPage() {
    return <Contact />;
}