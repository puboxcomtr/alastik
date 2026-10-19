'use client';

import { useFrame } from '@react-three/fiber';
import { type RefObject, useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { buildContinentPoints } from './globe-geo';
import { HERO_COLORS, HERO_CONFIG } from './hero-config';
import { clamp01, introAlpha } from './hero-easing';

type GlobePointsProps = {
  density: number;
  prefersReducedMotion: boolean;
  startedAt: RefObject<number>;
};

function GlobePoints({ density, prefersReducedMotion, startedAt }: GlobePointsProps) {
  const { globe, intro } = HERO_CONFIG;

  const geometry = useMemo(() => {
    const cloud = buildContinentPoints(
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
