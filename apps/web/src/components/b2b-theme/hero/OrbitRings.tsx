'use client';

import { useFrame } from '@react-three/fiber';
import { type RefObject, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { HERO_COLORS, HERO_CONFIG } from './hero-config';
import { clamp01, introAlpha, lerp } from './hero-easing';
import type { HeroMotionState } from './useHeroMotion';

type OrbitRingsProps = {
  ringCount: number;
  motionRef: RefObject<HeroMotionState>;
  prefersReducedMotion: boolean;
  startedAt: RefObject<number>;
};

function OrbitRings({ ringCount, motionRef, prefersReducedMotion, startedAt }: OrbitRingsProps) {
  const groupRefs = useRef<(THREE.Group | null)[]>([]);
  const materialRefs = useRef<(THREE.MeshBasicMaterial | null)[]>([]);

  const rings = useMemo(() => HERO_CONFIG.orbits.rings.slice(0, ringCount), [ringCount]);

  const goldColor = useMemo(() => new THREE.Color(HERO_COLORS.gold), []);

  useFrame(({ clock }) => {
    const elapsed = clock.elapsedTime - startedAt.current;
    const scrollProgress = motionRef.current?.scrollProgress ?? 0;

    rings.forEach((ring, index) => {
      const group = groupRefs.current[index];
      const material = materialRefs.current[index];

      if (group && !prefersReducedMotion) {
        const direction = index % 2 === 0 ? 1 : -1;
        group.rotation.y = ((elapsed / ring.seconds) * Math.PI * 2 * direction) % (Math.PI * 2);
      }

      if (!material) {
        return;
      }

      const { orbitsIn } = HERO_CONFIG.intro;
      const revealed = prefersReducedMotion
        ? 1
        : clamp01(introAlpha(elapsed, orbitsIn.at + index * orbitsIn.stagger, orbitsIn.duration));

      const scrollFade = lerp(1, HERO_CONFIG.scroll.orbitOpacityTo, scrollProgress);

      material.opacity = ring.opacity * revealed * scrollFade;
    });
  });

  return (
    <group>
      {rings.map((ring, index) => (
        <group
          key={ring.radius}
          ref={(node) => {
            groupRefs.current[index] = node;
          }}
          rotation={[ring.tiltX, ring.tiltY, 0]}
        >
          <mesh rotation={[Math.PI / 2, 0, 0]} frustumCulled={false}>
            <torusGeometry args={[ring.radius, HERO_CONFIG.orbits.thickness, 3, 220]} />
            <meshBasicMaterial
              ref={(node) => {
                materialRefs.current[index] = node;
              }}
              color={goldColor}
              transparent
              opacity={0}
              depthWrite={false}
              toneMapped={false}
            />
          </mesh>
        </group>
      ))}
    </group>
  );
}

export default OrbitRings;
