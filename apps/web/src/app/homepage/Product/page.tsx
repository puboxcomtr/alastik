'use client';
import React from 'react';

// Components
import ShowCaseProduct from '@components/homepage/Showcase/Product';

type Props = {
    showcaseKey?: 'first' | 'second' | 'third' | 'fourth' | 'fifth';
}

export default function ProductPage({ showcaseKey = 'second' }: Props) {
    return (
        <ShowCaseProduct showcaseKey={showcaseKey} />
    );
}