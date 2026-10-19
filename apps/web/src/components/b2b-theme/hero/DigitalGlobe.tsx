'use client';

import { useFrame } from '@react-three/fiber';
import { type RefObject, useEffect, useMemo } from 'react';
import * as THREE from 'three';
import GlobeGrid from './GlobeGrid';
import GlobePoints from './GlobePoints';
import NetworkArcs from './NetworkArcs';
import { HERO_COLORS, HERO_CONFIG } from './hero-config';
import { clamp01, introAlpha, lerp } from './hero-easing';

const CORE_VERTEX_SHADER =  `
  varying vec3 vNormal;
  varying vec3 vViewDirection;

  void main() {
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vNormal = normalize(mat3(modelMatrix) * normal);
    vViewDirection = normalize(cameraPosition - worldPosition.xyz);
    gl_Position = projectionMatrix * viewMatrix * worldPosition;
  }
`;

const CORE_FRAGMENT_SHADER =  `
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

const ATMOSPHERE_FRAGMENT_SHADER =  `
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

    coreMaterial.uniforms.uOpacity.value = revealed;
    atmosphereMaterial.uniforms.uStrength.value = globe.atmosphereStrength * revealed;

    if (spinRef.current?.parent) {
      const scale = lerp(intro.globeFromScale, 1, revealed);
      spinRef.current.parent.scale.setScalar(scale);
    }
  });

  return (
    <group>
      <group rotation={[globe.cameraLean, 0, globe.axialTilt]}>
        <group ref={spinRef} rotation={[0, globe.initialYaw, 0]}>
          <mesh material={coreMaterial} renderOrder={-1}>
            <sphereGeometry args={[globe.radius, 64, 48]} />
          </mesh>
          <GlobePoints density={dotDensity} prefersReducedMotion={prefersReducedMotion} startedAt={startedAt} />
          <GlobeGrid prefersReducedMotion={prefersReducedMotion} startedAt={startedAt} />
          <NetworkArcs prefersReducedMotion={prefersReducedMotion} startedAt={startedAt} />
        </group>
      </group>

      <mesh material={atmosphereMaterial} scale={globe.atmosphereScale}>
        <sphereGeometry args={[globe.radius, 48, 32]} />
      </mesh>
    </group>
  );
}

export default DigitalGlobe;
