'use client';
import React from 'react';
import AlastikTireSearch from '@components/alastik/homepage/TireSearch/Main';
import LjaTireSearch from '@components/lastikjantavm/homepage/TireSearch/Main';

type Props = { site?: string };

export default function TireSearchPage({ site = 'alastik' }: Props) {
  const TireSearch = site === 'lastikjantavm' ? LjaTireSearch : AlastikTireSearch;
  return <TireSearch />;
}