'use client';

import { useFrame } from '@react-three/fiber';
import { type RefObject, useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { buildArcCurve, latLonToVector3, NETWORK_ARCS, NETWORK_NODES } from './globe-geo';
import { HERO_COLORS, HERO_CONFIG } from './hero-config';
import { clamp01, introAlpha } from './hero-easing';

/**
 * The supply-network layer: a handful of gold arcs leaving Istanbul, small
 * glowing endpoints, and one light pulse travelling each route.
 *
 * Sparse on purpose — the brief wants "global supply network", not a command
 * centre. Everything lives inside the globe's spin group so routes stay glued
 * to their geography as the planet turns.
 */

const ARC_SEGMENTS = 48;

type NetworkArcsProps = {
  prefersReducedMotion: boolean;
  startedAt: RefObject<number>;
};

function NetworkArcs({ prefersReducedMotion, startedAt }: NetworkArcsProps) {
  const { globe, intro } = HERO_CONFIG;
  const pulsesRef = useRef<THREE.Points>(null);

  const { arcGeometries, curves, nodeGeometry } = useMemo(() => {
    const surface = globe.radius * 1.005;
    const nodePositions = NETWORK_NODES.map((node) => latLonToVector3(node.lat, node.lon, surface));

    const builtCurves = NETWORK_ARCS.map(([fromIndex, toIndex]) =>
      buildArcCurve(nodePositions[fromIndex], nodePositions[toIndex], globe.radius, globe.arcLift),
    );

    const builtArcGeometries = builtCurves.map((curve) =>
      new THREE.BufferGeometry().setFromPoints(curve.getPoints(ARC_SEGMENTS)),
    );

    const builtNodeGeometry = new THREE.BufferGeometry().setFromPoints(nodePositions);

    return { arcGeometries: builtArcGeometries, curves: builtCurves, nodeGeometry: builtNodeGeometry };
  }, [globe.arcLift, globe.radius]);

  const arcMaterial = useMemo(
    () =>
      new THREE.LineBasicMaterial({
        color: HERO_COLORS.gold,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    [],
  );

  const nodeMaterial = useMemo(
    () =>
      new THREE.PointsMaterial({
        color: HERO_COLORS.gold,
        size: globe.nodeSize,
        sizeAttenuation: true,
        transparent: true,
        opacity: 0,
        depthWrite: false,
      }),
    [globe.nodeSize],
  );

  const pulseMaterial = useMemo(
    () =>
      new THREE.PointsMaterial({
        color: '#fff7b0',
        // Bigger than the static endpoint nodes: these are the only things in
        // the scene that actually travel, so they have to be findable.
        size: globe.nodeSize * 1.8,
        sizeAttenuation: true,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    [globe.nodeSize],
  );

  const pulseGeometry = useMemo(() => {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      'position',
      new THREE.BufferAttribute(new Float32Array(curves.length * globe.pulsesPerArc * 3), 3),
    );

    return geometry;
  }, [curves.length, globe.pulsesPerArc]);

  // THREE.Line instances (not meshes), built once — recreating them per
  // render would leak scene objects.
  const arcLines = useMemo(
    () => arcGeometries.map((geometry) => new THREE.Line(geometry, arcMaterial)),
    [arcGeometries, arcMaterial],
  );

  useEffect(
    () => () => {
      arcGeometries.forEach((geometry) => geometry.dispose());
      nodeGeometry.dispose();
      pulseGeometry.dispose();
      arcMaterial.dispose();
      nodeMaterial.dispose();
      pulseMaterial.dispose();
    },
    [arcGeometries, arcMaterial, nodeGeometry, nodeMaterial, pulseGeometry, pulseMaterial],
  );

  useFrame(({ clock }) => {
    const elapsed = clock.elapsedTime - startedAt.current;
    const revealed = prefersReducedMotion
      ? 1
      : clamp01(introAlpha(elapsed, intro.detailsIn.at, intro.detailsIn.duration));

    arcMaterial.opacity = globe.arcOpacity * revealed;
    nodeMaterial.opacity = 0.8 * revealed;

    // The travelling pulses are pure motion decoration: parked at the hub and
    // invisible under reduced motion.
    if (prefersReducedMotion) {
      pulseMaterial.opacity = 0;

      return;
    }

    pulseMaterial.opacity = 0.85 * revealed;

    const pulses = pulsesRef.current;

    if (!pulses) {
      return;
    }

    const positions = pulses.geometry.getAttribute('position') as THREE.BufferAttribute;

    curves.forEach((curve, index) => {
      // Several lights per route, staggered along it and across routes, so
      // the network reads as steady traffic rather than a single blip.
      for (let pulse = 0; pulse < globe.pulsesPerArc; pulse += 1) {
        const t = (elapsed / globe.arcPulseSeconds + index * 0.37 + pulse / globe.pulsesPerArc) % 1;
        const point = curve.getPoint(t);
        positions.setXYZ(index * globe.pulsesPerArc + pulse, point.x, point.y, point.z);
      }
    });

    positions.needsUpdate = true;
  });

  return (
    <group>
      {arcLines.map((line, index) => (
        <primitive key={index} object={line} />
      ))}
      <points geometry={nodeGeometry} material={nodeMaterial} frustumCulled={false} />
      <points ref={pulsesRef} geometry={pulseGeometry} material={pulseMaterial} frustumCulled={false} />
    </group>
  );
}

export default NetworkArcs;
