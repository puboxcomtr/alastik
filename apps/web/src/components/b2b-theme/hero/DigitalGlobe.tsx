'use client';

import { useFrame } from '@react-three/fiber';
import { type RefObject, useEffect, useMemo } from 'react';
import * as THREE from 'three';
import GlobeGrid from './GlobeGrid';
import GlobePoints from './GlobePoints';
import NetworkArcs from './NetworkArcs';
import { HERO_COLORS, HERO_CONFIG } from './hero-config';
import { clamp01, introAlpha, lerp } from './hero-easing';

/**
 * The digital globe assembly.
 *
 * Layers, inside out: a navy core sphere with a steel fresnel edge (a custom
 * two-uniform shader — no lighting maths, so it costs almost nothing), the
 * dotted continents, the lat/long grid, the supply-network arcs, and a
 * restrained gold atmosphere halo.
 *
 * Everything geographic lives inside the `spinRef` group: HeroScene drives
 * that group's rotation, so continents, grid and routes turn together as one
 * planet. The atmosphere sits outside the spin — a halo has no geography, and
 * keeping it still avoids any visible swimming of the rim glow.
 *
 * Not a photorealistic Earth by design: no satellite textures, no clouds, no
 * terrain. This is the brand's "global network" object, in the site's navy
 * and gold.
 */

const CORE_VERTEX_SHADER = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vViewDirection;

  void main() {
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vNormal = normalize(mat3(modelMatrix) * normal);
    vViewDirection = normalize(cameraPosition - worldPosition.xyz);
    gl_Position = projectionMatrix * viewMatrix * worldPosition;
  }
`;

const CORE_FRAGMENT_SHADER = /* glsl */ `
  uniform vec3 uBaseColor;
  uniform vec3 uFresnelColor;
  uniform float uOpacity;

  varying vec3 vNormal;
  varying vec3 vViewDirection;

  void main() {
    float facing = clamp(dot(normalize(vNormal), normalize(vViewDirection)), 0.0, 1.0);
    float fresnel = pow(1.0 - facing, 2.4);
    vec3 color = mix(uBaseColor, uFresnelColor, fresnel * 0.85);
    gl_FragColor = vec4(color, uOpacity);
  }
`;

const ATMOSPHERE_FRAGMENT_SHADER = /* glsl */ `
  uniform vec3 uGlowColor;
  uniform float uStrength;

  varying vec3 vNormal;
  varying vec3 vViewDirection;

  void main() {
    float facing = clamp(dot(normalize(vNormal), normalize(vViewDirection)), 0.0, 1.0);
    float rim = pow(1.0 - facing, 3.0);
    gl_FragColor = vec4(uGlowColor, rim * uStrength);
  }
`;

type DigitalGlobeProps = {
  /** HeroScene rotates this group — the planet's independent spin. */
  spinRef: RefObject<THREE.Group | null>;
  dotDensity: number;
  prefersReducedMotion: boolean;
  startedAt: RefObject<number>;
};

function DigitalGlobe({ spinRef, dotDensity, prefersReducedMotion, startedAt }: DigitalGlobeProps) {
  const { globe, intro } = HERO_CONFIG;

  const coreMaterial = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: CORE_VERTEX_SHADER,
        fragmentShader: CORE_FRAGMENT_SHADER,
        uniforms: {
          uBaseColor: { value: new THREE.Color(HERO_COLORS.globeBase) },
          uFresnelColor: { value: new THREE.Color(HERO_COLORS.globeFresnel) },
          uOpacity: { value: 0 },
        },
        transparent: true,
      }),
    [],
  );

  const atmosphereMaterial = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: CORE_VERTEX_SHADER,
        fragmentShader: ATMOSPHERE_FRAGMENT_SHADER,
        uniforms: {
          uGlowColor: { value: new THREE.Color(HERO_COLORS.gold) },
          uStrength: { value: 0 },
        },
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    [],
  );

  useEffect(
    () => () => {
      coreMaterial.dispose();
      atmosphereMaterial.dispose();
    },
    [atmosphereMaterial, coreMaterial],
  );

  useFrame(({ clock }) => {
    const elapsed = clock.elapsedTime - startedAt.current;
    const revealed = prefersReducedMotion
      ? 1
      : clamp01(introAlpha(elapsed, intro.globeIn.at, intro.globeIn.duration));

    // Fully opaque once revealed: even a 3% see-through sphere lets the
    // brightly lit rim spokes ghost through the dark ocean side.
    coreMaterial.uniforms.uOpacity.value = revealed;
    atmosphereMaterial.uniforms.uStrength.value = globe.atmosphereStrength * revealed;

    // The globe grows in with its own stage, independent of the tire's.
    if (spinRef.current?.parent) {
      const scale = lerp(intro.globeFromScale, 1, revealed);
      spinRef.current.parent.scale.setScalar(scale);
    }
  });

  return (
    <group>
      {/* Axial tilt wrapper; the spin group inside turns about the tilted
          axis. The X lean tips the dot-dense northern latitudes toward the
          camera — see cameraLean in hero-config. */}
      <group rotation={[globe.cameraLean, 0, globe.axialTilt]}>
        <group ref={spinRef} rotation={[0, globe.initialYaw, 0]}>
          {/* Drawn before everything else on the globe. The core is transparent
              (it fades in), so three.js depth-sorts it against its siblings by
              geometry centre — and the jittered dot cloud's centre sits a
              random hair either side of the sphere's. On the losing half of
              page loads the core painted over the continents, leaving only
              the dots past the limb. An explicit order removes the coin flip. */}
          <mesh material={coreMaterial} renderOrder={-1}>
            <sphereGeometry args={[globe.radius, 64, 48]} />
          </mesh>
          <GlobePoints density={dotDensity} prefersReducedMotion={prefersReducedMotion} startedAt={startedAt} />
          <GlobeGrid prefersReducedMotion={prefersReducedMotion} startedAt={startedAt} />
          <NetworkArcs prefersReducedMotion={prefersReducedMotion} startedAt={startedAt} />
        </group>
      </group>

      {/* Halo outside the spin: a glow has no geography to rotate. */}
      <mesh material={atmosphereMaterial} scale={globe.atmosphereScale}>
        <sphereGeometry args={[globe.radius, 48, 32]} />
      </mesh>
    </group>
  );
}

export default DigitalGlobe;
