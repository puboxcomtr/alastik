'use client';

import { useGSAP } from '@gsap/react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { type RefObject, useEffect, useRef } from 'react';
import { HERO_CONFIG } from './hero-config';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

/**
 * Motion inputs shared between the DOM hero and the WebGL scene.
 *
 * This is a plain mutable object rather than React state on purpose: pointer
 * moves and scroll fire far more often than we would ever want to re-render,
 * and the canvas reads these values inside its own `useFrame` loop. Writing to
 * a ref keeps both reconcilers out of it entirely.
 */
export type HeroMotionState = {
  /** Pointer position over the hero, normalized to -1..1. */
  pointerX: number;
  pointerY: number;
  /** 0 at the top of the hero, 1 once it has scrolled fully out. */
  scrollProgress: number;
};

const FINE_POINTER_QUERY = '(hover: hover) and (pointer: fine)';

/**
 * Wires pointer parallax and hero scroll progress onto a shared state object.
 *
 * Both inputs are neutralized when the visitor prefers reduced motion, and the
 * pointer listener is only attached for real mice — on touch, `pointermove`
 * would fire during a scroll drag and make the tire lurch.
 */
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

    // Passive: this listener never calls preventDefault, and saying so keeps it
    // off the scroll-blocking path.
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

      // No pin and no scrub tween: this only samples how far the hero has
      // travelled so the scene can react. The visitor's scroll is untouched.
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

/** Frame-rate independent damping factor for the configured lerp amount. */
export function dampingFactor(delta: number): number {
  return 1 - Math.pow(1 - HERO_CONFIG.pointer.damping, delta * 60);
}

export default useHeroMotion;
