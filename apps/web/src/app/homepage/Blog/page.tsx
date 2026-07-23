'use client';
import React from 'react';
import AlastikHomeBlog from '@components/alastik/shop/HomeBlog';
import LjaHomeBlog from '@components/lastikjantavm/shop/HomeBlog';

type Props = { site?: string };

export default function HomeBlogPage({ site = 'alastik' }: Props) {
    const HomeBlog = site === 'lastikjantavm' ? LjaHomeBlog : AlastikHomeBlog;
    return <HomeBlog />;
}