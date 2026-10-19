'use client';

import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { type RefObject, useLayoutEffect, useRef } from 'react';
import * as THREE from 'three';
import DigitalGlobe from './DigitalGlobe';
import HeroParticles from './HeroParticles';
import OrbitRings from './OrbitRings';
import TireModel from './TireModel';
import { HERO_COLORS, HERO_CONFIG, type HeroLayout } from './hero-config';
import { clamp01, introAlpha, lerp } from './hero-easing';
import { dampingFactor, type HeroMotionState } from './useHeroMotion';

const { globe, tire, placement, orbits, particles, lighting, scroll, intro, performance: perf } = HERO_CONFIG;

type SceneProps = {
  layout: HeroLayout;
  motionRef: RefObject<HeroMotionState>;
  prefersReducedMotion: boolean;
};

function ClockAnchor({ startedAt }: { startedAt: RefObject<number> }) {
  const clock = useThree((state) => state.clock);

  useLayoutEffect(() => {
    startedAt.current = clock.getElapsedTime();
  }, [clock, startedAt]);

  return null;
}

function CompositionRig({
  layout,
  motionRef,
  prefersReducedMotion,
  startedAt,
}: SceneProps & { startedAt: RefObject<number> }) {
  const placementRef = useRef<THREE.Group>(null);
  const parallaxRef = useRef<THREE.Group>(null);
  const globeSpinRef = useRef<THREE.Group>(null);
  const tirePivotRef = useRef<THREE.Group>(null);
  const treadSpinRef = useRef<THREE.Group>(null);

  const currentYaw = useRef(0);
  const currentPitch = useRef(0);
  const isTireIntroSettled = useRef(false);

  const spot = placement[layout];

  const ringCount =
    layout === 'mobile' ? orbits.mobileCount : layout === 'tablet' ? orbits.tabletCount : orbits.rings.length;
  const dotDensity = globe.dotDensity[layout];

  useFrame(({ clock }, delta) => {
    const elapsed = clock.getElapsedTime() - startedAt.current;
    const scrollProgress = motionRef.current?.scrollProgress ?? 0;

    const tireIntro = prefersReducedMotion
      ? 1
      : clamp01(introAlpha(elapsed, intro.tireIn.at, intro.tireIn.duration));

    if (!isTireIntroSettled.current && treadSpinRef.current) {
      const hasSettled = tireIntro >= 1;

      treadSpinRef.current.traverse((object) => {
        const mesh = object as THREE.Mesh;

        if (!mesh.isMesh) {
          return;
        }

        const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];

        materials.forEach((material) => {
          if (hasSettled) {
            material.transparent = false;
            material.opacity = 1;
          } else {
            material.transparent = true;
            material.opacity = tireIntro;
          }

          material.needsUpdate = true;
        });
      });

      isTireIntroSettled.current = hasSettled;
    }

    if (placementRef.current) {
      placementRef.current.position.set(
        spot.x + scroll.translateX * scrollProgress,
        spot.y +
          scroll.translateY * scrollProgress +
          (prefersReducedMotion ? 0 : Math.sin((elapsed / tire.floatSeconds) * Math.PI * 2) * tire.floatAmplitude),
        0,
      );
      placementRef.current.scale.setScalar(spot.scale * lerp(1, scroll.scaleTo, scrollProgress));
    }

    if (parallaxRef.current) {
      if (prefersReducedMotion) {
        parallaxRef.current.rotation.set(0, 0, 0);
      } else {
        const pointer = motionRef.current;
        const targetYaw = (pointer?.pointerX ?? 0) * HERO_CONFIG.pointer.maxYaw;
        const targetPitch = (pointer?.pointerY ?? 0) * HERO_CONFIG.pointer.maxPitch;
        const factor = dampingFactor(delta);

        currentYaw.current = lerp(currentYaw.current, targetYaw, factor);
        currentPitch.current = lerp(currentPitch.current, targetPitch, factor);

        parallaxRef.current.rotation.y = currentYaw.current;
        parallaxRef.current.rotation.x = currentPitch.current;
      }
    }

    if (globeSpinRef.current && !prefersReducedMotion) {
      globeSpinRef.current.rotation.y =
        globe.initialYaw + Math.sin((elapsed / globe.rotationSeconds) * Math.PI * 2) * globe.swingAmplitude;
    }

    if (tirePivotRef.current && !prefersReducedMotion) {
      const driftElapsed = Math.max(0, elapsed - (intro.tireIn.at + intro.tireIn.duration));
      const drift = Math.sin((driftElapsed / tire.driftSeconds) * Math.PI * 2) * tire.driftAmplitude;
      const scrolled = scrollProgress * scroll.extraTurns * Math.PI * 2;

      tirePivotRef.current.rotation.x = tire.restPhase + drift + scrolled;
      tirePivotRef.current.rotation.y =
        Math.sin((driftElapsed / tire.swaySeconds) * Math.PI * 2) * tire.swayAmplitude;
    }

    if (treadSpinRef.current) {
      const idle = prefersReducedMotion ? 0 : (elapsed / tire.treadSpinSeconds) * Math.PI * 2;
      const introSpin = lerp(intro.tireFromSpin, 0, tireIntro);

      treadSpinRef.current.rotation.y = idle + introSpin;
    }
  });

  return (
    <group ref={placementRef} position={[spot.x, spot.y, 0]} scale={spot.scale}>
      <group ref={parallaxRef}>
        <DigitalGlobe
          spinRef={globeSpinRef}
          dotDensity={dotDensity}
          prefersReducedMotion={prefersReducedMotion}
          startedAt={startedAt}
        />

        <group position={[0, tire.verticalOffset, 0]} rotation={[0, 0, tire.screenRoll]}>
          <group ref={tirePivotRef} rotation={[tire.restPhase, 0, 0]}>
            <group rotation={[0, tire.baseTiltY, tire.baseTiltZ]}>
              <group ref={treadSpinRef}>
                <group scale={tire.fittedScale}>
                  <TireModel />
                </group>
              </group>
            </group>
          </group>
        </group>

        <OrbitRings
          ringCount={ringCount}
          motionRef={motionRef}
          prefersReducedMotion={prefersReducedMotion}
          startedAt={startedAt}
        />
      </group>
    </group>
  );
}

function SceneContents({ layout, motionRef, prefersReducedMotion }: SceneProps) {
  const startedAt = useRef(0);

  const particleCount =
    layout === 'mobile'
      ? particles.mobileCount
      : layout === 'tablet'
        ? particles.tabletCount
        : particles.desktopCount;

  return (
    <>
      <ClockAnchor startedAt={startedAt} />

      <ambientLight intensity={lighting.ambientIntensity} color="#c9d3e4" />
      <directionalLight position={lighting.key.position} intensity={lighting.key.intensity} color="#ffffff" />
      <directionalLight
        position={lighting.rim.position}
        intensity={lighting.rim.intensity}
        color={HERO_COLORS.gold}
      />
      <pointLight
        position={lighting.fill.position}
        intensity={lighting.fill.intensity}
        color={lighting.fill.color}
        distance={18}
      />

      <HeroParticles count={particleCount} prefersReducedMotion={prefersReducedMotion} startedAt={startedAt} />

      <CompositionRig
        layout={layout}
        motionRef={motionRef}
        prefersReducedMotion={prefersReducedMotion}
        startedAt={startedAt}
      />
    </>
  );
}

type HeroSceneProps = SceneProps & {
  isActive: boolean;
  onReady?: () => void;
};

function HeroScene({ layout, motionRef, prefersReducedMotion, isActive, onReady }: HeroSceneProps) {
  const isMobile = layout === 'mobile';

  return (
    <Canvas
      aria-hidden="true"
      tabIndex={-1}
      style={{ width: '100%', height: '100%', pointerEvents: 'none' }}
      resize={{ offsetSize: true }}
      dpr={isMobile ? perf.dprMobile : perf.dprDesktop}
      frameloop={isActive && !prefersReducedMotion ? 'always' : 'demand'}
      camera={{ fov: HERO_CONFIG.camera.fov, position: [...HERO_CONFIG.camera.position] }}
      gl={{
        alpha: true,
        antialias: !isMobile || perf.antialiasOnMobile,
        powerPreference: 'high-performance',
      }}
      onCreated={() => onReady?.()}
    >
      <SceneContents layout={layout} motionRef={motionRef} prefersReducedMotion={prefersReducedMotion} />
    </Canvas>
  );
}

export default HeroScene;
