'use client';
import React from 'react';
import AlastikSingleShowcase from '@components/alastik/shop/Product/Showcase/Single';
import LjaSingleShowcase from '@components/lastikjantavm/shop/Product/Showcase/Single';

type Props = {
  showcaseKey?: 'first' | 'second' | 'third' | 'fourth' | 'fifth';
  site?: string;
}

export default function SingleProduct({ showcaseKey = 'third', site = 'alastik' }: Props) {
  const SingleShowcase = site === 'lastikjantavm' ? LjaSingleShowcase : AlastikSingleShowcase;
  return <SingleShowcase showcaseKey={showcaseKey} site={site} />;
}