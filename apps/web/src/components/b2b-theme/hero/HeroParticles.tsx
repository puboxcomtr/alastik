'use client';

import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { HERO_COLORS, HERO_CONFIG } from './hero-config';
import { clamp01, introAlpha } from './hero-easing';

/**
 * Atmosphere behind the tire.
 *
 * A single `Points` object — one draw call — with per-point size, colour and
 * phase supplied as attributes. That needs a small shader (PointsMaterial has
 * one size for the whole cloud), which is also what makes the slow drift and
 * the faint twinkle free: both are computed on the GPU from a time uniform
 * rather than by rewriting the position buffer every frame.
 *
 * Counts are deliberately modest and drop further on small screens. This is
 * meant to read as depth in the background, not as a starfield.
 */

const VERTEX_SHADER = /* glsl */ `
  attribute float aSize;
  attribute float aPhase;
  attribute vec3 aColor;

  uniform float uTime;
  uniform float uOpacity;
  uniform float uPixelRatio;
  uniform float uDriftAmplitude;

  varying float vAlpha;
  varying vec3 vColor;

  void main() {
    vec3 transformed = position;
    transformed.y += sin(uTime * 0.42 + aPhase) * uDriftAmplitude;
    transformed.x += cos(uTime * 0.27 + aPhase * 1.7) * uDriftAmplitude * 0.5;

    vec4 mvPosition = modelViewMatrix * vec4(transformed, 1.0);
    gl_Position = projectionMatrix * mvPosition;

    float twinkle = 0.62 + 0.38 * sin(uTime * 0.85 + aPhase * 3.1);
    vAlpha = uOpacity * twinkle;
    vColor = aColor;

    gl_PointSize = aSize * uPixelRatio * (320.0 / max(-mvPosition.z, 0.001));
  }
`;

const FRAGMENT_SHADER = /* glsl */ `
  varying float vAlpha;
  varying vec3 vColor;

  void main() {
    float distanceToCentre = length(gl_PointCoord - vec2(0.5));

    if (distanceToCentre > 0.5) {
      discard;
    }

    float falloff = smoothstep(0.5, 0.0, distanceToCentre);
    gl_FragColor = vec4(vColor, vAlpha * falloff);
  }
`;

type HeroParticlesProps = {
  count: number;
  prefersReducedMotion: boolean;
  startedAt: React.RefObject<number>;
};

function HeroParticles({ count, prefersReducedMotion, startedAt }: HeroParticlesProps) {
  const groupRef = useRef<THREE.Group>(null);
  const pixelRatio = useThree((state) => state.gl.getPixelRatio());

  const geometry = useMemo(() => {
    const { particles } = HERO_CONFIG;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const phases = new Float32Array(count);

    const white = new THREE.Color('#dfe6f2');
    const gold = new THREE.Color(HERO_COLORS.gold);
    const scratch = new THREE.Color();

    for (let index = 0; index < count; index += 1) {
      positions[index * 3] = (Math.random() - 0.5) * particles.spread.x;
      positions[index * 3 + 1] = (Math.random() - 0.5) * particles.spread.y;
      // Biased behind the tire so particles do not wash over the tread.
      positions[index * 3 + 2] = -Math.random() * particles.spread.z;

      // A minority of gold motes; the rest stay a cool near-white so the
      // background never turns into a colour wash.
      scratch.copy(Math.random() < 0.22 ? gold : white);
      colors[index * 3] = scratch.r;
      colors[index * 3 + 1] = scratch.g;
      colors[index * 3 + 2] = scratch.b;

      sizes[index] = particles.minSize + Math.random() * (particles.maxSize - particles.minSize);
      phases[index] = Math.random() * Math.PI * 2;
    }

    const bufferGeometry = new THREE.BufferGeometry();
    bufferGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    bufferGeometry.setAttribute('aColor', new THREE.BufferAttribute(colors, 3));
    bufferGeometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
    bufferGeometry.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));

    return bufferGeometry;
  }, [count]);

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: VERTEX_SHADER,
        fragmentShader: FRAGMENT_SHADER,
        uniforms: {
          uTime: { value: 0 },
          uOpacity: { value: 0 },
          uPixelRatio: { value: pixelRatio },
          uDriftAmplitude: { value: HERO_CONFIG.particles.driftAmplitude },
        },
        transparent: true,
        depthWrite: false,
        // Additive on a near-black background gives the faint glow the brief
        // asks for without needing a bloom pass.
        blending: THREE.AdditiveBlending,
      }),
    [pixelRatio],
  );

  useEffect(() => {
    material.uniforms.uPixelRatio.value = pixelRatio;
  }, [material, pixelRatio]);

  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
    },
    [geometry, material],
  );

  useFrame(({ clock }) => {
    const elapsed = clock.elapsedTime - startedAt.current;
    const { particlesIn } = HERO_CONFIG.intro;

    material.uniforms.uOpacity.value =
      HERO_CONFIG.particles.opacity *
      (prefersReducedMotion ? 1 : clamp01(introAlpha(elapsed, particlesIn.at, particlesIn.duration)));

    if (prefersReducedMotion) {
      material.uniforms.uTime.value = 0;
      material.uniforms.uDriftAmplitude.value = 0;

      return;
    }

    material.uniforms.uTime.value = elapsed;

    if (groupRef.current) {
      groupRef.current.rotation.y = (elapsed / HERO_CONFIG.particles.rotationSeconds) * Math.PI * 2;
    }
  });

  return (
    <group ref={groupRef}>
      <points geometry={geometry} material={material} frustumCulled={false} />
    </group>
  );
}

export default HeroParticles;
