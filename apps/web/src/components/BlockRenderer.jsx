// apps/web/src/components/BlockRenderer.jsx
'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { API_ENDPOINTS } from '@/src/config/api';

const components = {
    Topbar: dynamic(() => import('./blocks/Topbar')),
};

export default function BlockRenderer({ blockKey }) {
    const [block, setBlock] = useState(null);

    useEffect(() => {
        const fetchBlock = async () => {
            try {
                const res = await fetch(API_ENDPOINTS.blocks.detail(blockKey));
                const data = await res.json();

                if (data.success) {
                    setBlock(data.data);
                }
            } catch (error) {
                console.error(`Block fetch error (${blockKey}):`, error);
            }
        };

        fetchBlock();
    }, [blockKey]);

    if (!block || !block.active) return null;

    const Component = components[block.component];
    if (!Component) {
        console.warn(`Component not registered: ${block.component}`);
        return null;
    }

    return <Component data={block.content} />;
}