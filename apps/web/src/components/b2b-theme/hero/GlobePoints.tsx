'use client';

import { useFrame } from '@react-three/fiber';
import { type RefObject, useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { buildContinentPoints } from './globe-geo';
import { HERO_COLORS, HERO_CONFIG } from './hero-config';
import { clamp01, introAlpha } from './hero-easing';

/**
 * The dotted continents — the globe's signature detail.
 *
 * One `Points` object, one draw call, positions baked once on mount from the
 * embedded land mask in globe-geo.ts. Warm off-white dots with a small gold
 * minority keep the field in the site's palette without turning the planet
 * into a colour wash.
 *
 * Rendered inside the globe's spin group, so the geography rotates with the
 * planet exactly as the brief requires.
 */

type GlobePointsProps = {
  density: number;
  prefersReducedMotion: boolean;
  startedAt: RefObject<number>;
};

function GlobePoints({ density, prefersReducedMotion, startedAt }: GlobePointsProps) {
  const { globe, intro } = HERO_CONFIG;

  const geometry = useMemo(() => {
    const cloud = buildContinentPoints(
      // Fractionally above the surface so dots never z-fight the sphere.
      globe.radius * 1.004,
      density,
      HERO_COLORS.globeDots,
      HERO_COLORS.gold,
      globe.goldDotRatio,
    );

    const bufferGeometry = new THREE.BufferGeometry();
    bufferGeometry.setAttribute('position', new THREE.BufferAttribute(cloud.positions, 3));
    bufferGeometry.setAttribute('color', new THREE.BufferAttribute(cloud.colors, 3));

    return bufferGeometry;
  }, [density, globe.goldDotRatio, globe.radius]);

  const material = useMemo(
    () =>
      new THREE.PointsMaterial({
        size: globe.dotSize,
        sizeAttenuation: true,
        vertexColors: true,
        transparent: true,
        opacity: 0,
        depthWrite: false,
      }),
    [globe.dotSize],
  );

  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
    },
    [geometry, material],
  );

  useFrame(({ clock }) => {
    const elapsed = clock.elapsedTime - startedAt.current;

    material.opacity = prefersReducedMotion
      ? 1
      : clamp01(introAlpha(elapsed, intro.detailsIn.at, intro.detailsIn.duration));
  });

  return <points geometry={geometry} material={material} frustumCulled={false} />;
}

export default GlobePoints;
