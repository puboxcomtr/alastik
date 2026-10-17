'use client';

import { useEffect, useState } from 'react';
import type { HeroLayout } from './hero-config';

/**
 * Which of the three hero compositions to render.
 *
 * The breakpoints mirror Tailwind's `md` (768px) and `xl` (1280px) so the 3D
 * placement changes on the same lines the CSS layout does.
 *
 * SSR-safe in the same way as `useReducedMotion`: it starts on the desktop
 * composition so server and first client render agree, then reads the real
 * viewport in an effect. The canvas only mounts on the client anyway, so this
 * never produces a hydration mismatch in markup.
 */
const TABLET_QUERY = '(min-width: 768px)';
const DESKTOP_QUERY = '(min-width: 1280px)';

function readLayout(): HeroLayout {
  if (window.matchMedia(DESKTOP_QUERY).matches) {
    return 'desktop';
  }

  return window.matchMedia(TABLET_QUERY).matches ? 'tablet' : 'mobile';
}

export function useHeroLayout(): HeroLayout {
  const [layout, setLayout] = useState<HeroLayout>('desktop');

  useEffect(() => {
    const tablet = window.matchMedia(TABLET_QUERY);
    const desktop = window.matchMedia(DESKTOP_QUERY);
    const sync = () => setLayout(readLayout());

    sync();

    tablet.addEventListener('change', sync);
    desktop.addEventListener('change', sync);

    return () => {
      tablet.removeEventListener('change', sync);
      desktop.removeEventListener('change', sync);
    };
  }, []);

  return layout;
}

export default useHeroLayout;
