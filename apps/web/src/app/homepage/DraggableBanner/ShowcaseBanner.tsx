'use client';
import React from 'react';
import DraggableBanner from '@app/homepage/DraggableBanner/page';
import { useSettings } from '@/src/context/SettingsContext';
import type { ThemeSettings } from '@/src/types/theme';

type ShowcaseKey = 'first' | 'second' | 'third' | 'fourth' | 'fifth';

type Props = {
    showcaseKey: ShowcaseKey;
    site?: string;
};

const settingName = (key: ShowcaseKey): keyof ThemeSettings =>
    `showcasebanner${key.charAt(0).toUpperCase()}${key.slice(1)}` as keyof ThemeSettings;

export default function ShowcaseBanner({ showcaseKey, site = 'alastik' }: Props) {
    const { theme } = useSettings();
    const sliderKey = theme?.[settingName(showcaseKey)];

    if (!sliderKey || typeof sliderKey !== 'string') {
        return null;
    }

    return <DraggableBanner site={site} sliderKey={sliderKey} />;
}
