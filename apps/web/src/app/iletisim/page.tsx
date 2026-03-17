import React from 'react';
import type { Metadata } from 'next';
import Contact from '@/src/components/contact/Contact';

export const metadata: Metadata = {
    title: 'İletişim - ALastik.com',
    description: 'ALastik.com iletişim sayfası. Bize ulaşın.',
};

export default function ContactPage() {
    return <Contact />;
}