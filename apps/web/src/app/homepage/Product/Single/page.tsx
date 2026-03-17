'use client';
import React from 'react';

/* Components */
import SingleShowcase from '@/src/components/shop/Product/Showcase/Single';

type Props = {
  showcaseKey?: 'first' | 'second' | 'third' | 'fourth' | 'fifth';
}

export default function SingleProduct({ showcaseKey = 'third' }: Props) {
  return (
    <SingleShowcase showcaseKey={showcaseKey} />
  );
}