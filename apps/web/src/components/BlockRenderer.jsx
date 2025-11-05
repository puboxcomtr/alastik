// apps/web/src/components/BlockRenderer.jsx
'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';

const components = {
    Topbar: dynamic(() => import('./blocks/Topbar')),
};

export default function BlockRenderer({ blockKey }) {
    const [block, setBlock] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchBlock = async () => {
            try {
                const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3082/api';
                const res = await fetch(`${apiUrl}/blocks/${blockKey}`);
                const data = await res.json();

                if (data.success) {
                    setBlock(data.data);
                }
            } catch (error) {
                console.error(`Block fetch error (${blockKey}):`, error);
            } finally {
                setLoading(false);
            }
        };

        fetchBlock();
    }, [blockKey]);

    if (loading) return null;
    if (!block || !block.active) return null;

    const Component = components[block.component];
    if (!Component) {
        console.warn(`Component not registered: ${block.component}`);
        return null;
    }

    return <Component data={block.content} />;
}