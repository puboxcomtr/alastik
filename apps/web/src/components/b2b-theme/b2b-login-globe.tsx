'use client';
import dynamic from 'next/dynamic';
import React, { useEffect, useRef, useState } from 'react';
import useHeroLayout from '@components/b2b-theme/hero/useHeroLayout';
import useHeroMotion from '@components/b2b-theme/hero/useHeroMotion';
import useWebGLSupport from '@components/b2b-theme/hero/useWebGLSupport';

const HeroScene = dynamic(() => import('@components/b2b-theme/hero/HeroScene'), { ssr: false });

class SahneHataSiniri extends React.Component<{ children: React.ReactNode }, { hata: string | null }> {
    constructor(props: { children: React.ReactNode }) {
        super(props);
        this.state = { hata: null };
    }
    static getDerivedStateFromError(error: Error) {
        return { hata: error?.message || String(error) };
    }
    componentDidCatch(error: Error) {
        // eslint-disable-next-line no-console
        console.error('[B2BLoginGlobe] sahne hatası:', error);
    }
    render() {
        if (this.state.hata) {
            return (
                <div style={{ position: 'absolute', left: 16, bottom: 64, maxWidth: 320, zIndex: 2, color: '#ffb3b3', fontSize: 11, background: 'rgba(0,0,0,0.5)', padding: '6px 8px', borderRadius: 6 }}>
                    Sahne hatası: {this.state.hata}
                </div>
            );
        }
        return this.props.children;
    }
}

function usePrefersReducedMotion(): boolean {
    const [reduced, setReduced] = useState(false);
    useEffect(() => {
        const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
        const sync = () => setReduced(mq.matches);
        sync();
        mq.addEventListener('change', sync);
        return () => mq.removeEventListener('change', sync);
    }, []);
    return reduced;
}

export function B2BLoginGlobe() {
    const sectionRef = useRef<HTMLDivElement>(null);
    const prefersReducedMotion = usePrefersReducedMotion();
    const layout = useHeroLayout();
    const isWebGLSupported = useWebGLSupport();
    const motionRef = useHeroMotion(sectionRef, prefersReducedMotion);

    useEffect(() => {
        if (!isWebGLSupported) return;
        let r = 0;
        const tetikle = (n: number) => {
            window.dispatchEvent(new Event('resize'));
            if (n > 0) r = requestAnimationFrame(() => tetikle(n - 1));
        };
        const t = setTimeout(() => tetikle(3), 80);
        return () => { clearTimeout(t); cancelAnimationFrame(r); };
    }, [isWebGLSupported]);

    return (
        <div ref={sectionRef} aria-hidden="true" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
            {isWebGLSupported === false ? (
                <div style={{ position: 'absolute', left: 16, bottom: 64, zIndex: 2, color: '#ffd27a', fontSize: 11 }}>WebGL desteği yok (globe yüklenemez)</div>
            ) : isWebGLSupported ? (
                <SahneHataSiniri>
                    <HeroScene layout={layout} motionRef={motionRef} prefersReducedMotion={prefersReducedMotion} isActive />
                </SahneHataSiniri>
            ) : null}
        </div>
    );
}
