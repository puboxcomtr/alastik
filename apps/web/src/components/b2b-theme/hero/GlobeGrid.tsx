'use client';

import { useFrame } from '@react-three/fiber';
import { type RefObject, useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { HERO_COLORS, HERO_CONFIG } from './hero-config';
import { clamp01, introAlpha } from './hero-easing';

/**
 * Latitude and longitude lines — deliberately barely-there.
 *
 * Five parallels (every 30 degrees) and six meridian great circles (every 30
 * degrees of longitude), drawn as plain line loops sharing one material so
 * the whole layer fades as a unit. The brief's rule: the grid supports the
 * globe, it must never dominate it.
 */

const PARALLEL_LATITUDES = [-60, -30, 0, 30, 60] as const;
const MERIDIAN_COUNT = 6;
const SEGMENTS = 128;

type GlobeGridProps = {
  prefersReducedMotion: boolean;
  startedAt: RefObject<number>;
};

function GlobeGrid({ prefersReducedMotion, startedAt }: GlobeGridProps) {
  const { globe, intro } = HERO_CONFIG;

  const circleGeometry = useMemo(() => {
    // Unit circle in the XZ plane; parallels and meridians both reuse it.
    const points: THREE.Vector3[] = [];

    for (let step = 0; step <= SEGMENTS; step += 1) {
      const angle = (step / SEGMENTS) * Math.PI * 2;
      points.push(new THREE.Vector3(Math.cos(angle), 0, Math.sin(angle)));
    }

    return new THREE.BufferGeometry().setFromPoints(points);
  }, []);

  const material = useMemo(
    () =>
      new THREE.LineBasicMaterial({
        color: HERO_COLORS.globeGrid,
        transparent: true,
        opacity: 0,
        depthWrite: false,
      }),
    [],
  );

  useEffect(
    () => () => {
      circleGeometry.dispose();
      material.dispose();
    },
    [circleGeometry, material],
  );

  useFrame(({ clock }) => {
    const elapsed = clock.elapsedTime - startedAt.current;

    material.opacity = prefersReducedMotion
      ? globe.gridOpacity
      : globe.gridOpacity * clamp01(introAlpha(elapsed, intro.detailsIn.at, intro.detailsIn.duration));
  });

  // Grid sits a hair above the dots layer to stay visible over the sphere.
  const radius = globe.radius * 1.002;

  return (
    <group>
      {PARALLEL_LATITUDES.map((latitude) => {
        const latRadians = THREE.MathUtils.degToRad(latitude);

        return (
          <lineLoop
            key={`parallel-${latitude}`}
            geometry={circleGeometry}
            material={material}
            position={[0, radius * Math.sin(latRadians), 0]}
            scale={radius * Math.cos(latRadians)}
          />
        );
      })}
      {Array.from({ length: MERIDIAN_COUNT }, (_, index) => (
        <lineLoop
          key={`meridian-${index}`}
          geometry={circleGeometry}
          material={material}
          // Stand the circle up (X), then fan copies around the pole axis (Y).
          rotation={[Math.PI / 2, (index / MERIDIAN_COUNT) * Math.PI, 0]}
          scale={radius}
        />
      ))}
    </group>
  );
}

export default GlobeGrid;
