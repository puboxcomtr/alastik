'use client';
import React from 'react';

import AlastikShowCaseProduct from '@components/alastik/homepage/Showcase/Product';
import LjaShowCaseProduct from '@components/lastikjantavm/homepage/Showcase/Product';

type Props = {
    showcaseKey?: 'first' | 'second' | 'third' | 'fourth' | 'fifth';
    site?: string;
}

export default function ProductPage({ showcaseKey = 'second', site = 'alastik' }: Props) {
    const ShowCaseProduct = site === 'lastikjantavm' ? LjaShowCaseProduct : AlastikShowCaseProduct;
    return <ShowCaseProduct showcaseKey={showcaseKey} site={site} />;
}