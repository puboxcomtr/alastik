'use client';

import { useGSAP } from '@gsap/react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { type RefObject, useEffect, useRef } from 'react';
import { HERO_CONFIG } from './hero-config';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

export type HeroMotionState = {
  pointerX: number;
  pointerY: number;
  scrollProgress: number;
};

const FINE_POINTER_QUERY = '(hover: hover) and (pointer: fine)';

export function useHeroMotion(
  sectionRef: RefObject<HTMLElement | null>,
  prefersReducedMotion: boolean,
): RefObject<HeroMotionState> {
  const motionRef = useRef<HeroMotionState>({
    pointerX: 0,
    pointerY: 0,
    scrollProgress: 0,
  });

  useEffect(() => {
    const section = sectionRef.current;

    if (!section || prefersReducedMotion) {
      motionRef.current.pointerX = 0;
      motionRef.current.pointerY = 0;

      return;
    }

    if (!window.matchMedia(FINE_POINTER_QUERY).matches) {
      return;
    }

    const handlePointerMove = (event: PointerEvent) => {
      const bounds = section.getBoundingClientRect();

      if (bounds.width === 0 || bounds.height === 0) {
        return;
      }

      motionRef.current.pointerX = ((event.clientX - bounds.left) / bounds.width) * 2 - 1;
      motionRef.current.pointerY = ((event.clientY - bounds.top) / bounds.height) * 2 - 1;
    };

    const handlePointerLeave = () => {
      motionRef.current.pointerX = 0;
      motionRef.current.pointerY = 0;
    };

    section.addEventListener('pointermove', handlePointerMove, { passive: true });
    section.addEventListener('pointerleave', handlePointerLeave, { passive: true });

    return () => {
      section.removeEventListener('pointermove', handlePointerMove);
      section.removeEventListener('pointerleave', handlePointerLeave);
    };
  }, [prefersReducedMotion, sectionRef]);

  useGSAP(
    () => {
      const section = sectionRef.current;

      if (!section || prefersReducedMotion) {
        motionRef.current.scrollProgress = 0;

        return;
      }

      const trigger = ScrollTrigger.create({
        trigger: section,
        start: 'top top',
        end: 'bottom top',
        onUpdate: (self) => {
          motionRef.current.scrollProgress = self.progress;
        },
      });

      return () => trigger.kill();
    },
    { dependencies: [prefersReducedMotion], scope: sectionRef as RefObject<HTMLElement> },
  );

  return motionRef;
}

export function dampingFactor(delta: number): number {
  return 1 - Math.pow(1 - HERO_CONFIG.pointer.damping, delta * 60);
}

export default useHeroMotion;
