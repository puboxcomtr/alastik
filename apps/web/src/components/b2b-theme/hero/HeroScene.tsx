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

/**
 * The WebGL half of the hero: a digital globe with a tire fitted around it.
 *
 * The one rule that shapes this file is INDEPENDENT MOTION. The scene graph
 * keeps three separate transform domains:
 *
 *   placement group   — layout position, scroll drift, float, intro scale
 *   └─ parallax group — the ONLY thing the mouse touches
 *      ├─ DigitalGlobe → its own spin group (planetary axis, slow)
 *      ├─ TireOrientationPivot → TireTiltGroup → tread spin → TireModel
 *      └─ OrbitRings
 *
 * The tire's PRIMARY motion is the orientation pivot, and it is deliberately
 * tiny: the inclined ring holds the pose the composition is built around and
 * only drifts a few degrees up and down. Its near arc crosses in front of the
 * continents and its far arc hides behind them, permanently. Real depth
 * testing does that occlusion; nothing is faked with opacity. Tread rotation
 * about the axle exists only as a whisper of secondary motion.
 *
 * The globe's rotation, the tire's drift and the pointer parallax never write
 * to the same object, so they cannot overwrite each other.
 *
 * Decorative only — every piece of copy lives in the DOM (see Hero.tsx), and
 * the canvas is `aria-hidden` with pointer events off so it can never swallow
 * a click meant for the CTA or the header. Nothing here is imported on the
 * server: Hero.tsx pulls this module in with `next/dynamic({ ssr: false })`.
 */

const { globe, tire, placement, orbits, particles, lighting, scroll, intro, performance: perf } = HERO_CONFIG;

type SceneProps = {
  layout: HeroLayout;
  motionRef: RefObject<HeroMotionState>;
  prefersReducedMotion: boolean;
};

/** Anchors the intro timeline to the frame the scene actually started on. */
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

    // --- tire fade-in --------------------------------------------------------
    // Materials are collected every frame while the intro runs (a handful of
    // meshes, under a second) rather than once on mount, so a GLB that
    // finishes loading mid-intro fades in with everything else.
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
            // Restore opaque rendering so the tire sorts normally against the
            // globe — critical for the fitted look's front/back occlusion.
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

    // --- placement: layout spot, scroll drift, float -------------------------
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

    // --- pointer parallax: the outer group ONLY ------------------------------
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

    // --- the two INDEPENDENT motions -----------------------------------------
    // Planet: a slow pendulum swing across the land-rich hemispheres rather
    // than a full revolution — dotted continents stay facing the camera at
    // every point of the cycle, so the sphere always reads as Earth. Reduced
    // motion parks it at the initial yaw set in DigitalGlobe's JSX.
    if (globeSpinRef.current && !prefersReducedMotion) {
      globeSpinRef.current.rotation.y =
        globe.initialYaw + Math.sin((elapsed / globe.rotationSeconds) * Math.PI * 2) * globe.swingAmplitude;
    }

    // PRIMARY tire motion: the orientation pivot HOLDS the inclined ring at
    // its rest pose and only breathes a few degrees up and down about the
    // horizontal axis (plus an even smaller sway, and the nudge scrolling
    // contributes). The ring no longer laps the planet: the arc in front
    // stays in front and the arc behind stays behind, exactly as composed.
    // Reduced motion parks it at the same pose, dead still.
    if (tirePivotRef.current && !prefersReducedMotion) {
      // The drift clock starts when the tire has finished fading in, not at
      // mount, so the first frame a visitor can actually see is the rest pose
      // itself rather than a few degrees past it.
      const driftElapsed = Math.max(0, elapsed - (intro.tireIn.at + intro.tireIn.duration));
      const drift = Math.sin((driftElapsed / tire.driftSeconds) * Math.PI * 2) * tire.driftAmplitude;
      const scrolled = scrollProgress * scroll.extraTurns * Math.PI * 2;

      tirePivotRef.current.rotation.x = tire.restPhase + drift + scrolled;
      tirePivotRef.current.rotation.y =
        Math.sin((driftElapsed / tire.swaySeconds) * Math.PI * 2) * tire.swayAmplitude;
    }

    // SECONDARY tire motion: a whisper of rotation about the tire's own axle,
    // plus the small settling spin of the intro. Near-static by design.
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

        {/* Tire attitude, outermost: a lift above the globe's centre and a
            roll in the camera's own frame (left side down, right side up).
            Being outermost is the point — a Z rotation here is a real
            screen-space roll, which the tilts further in are not. */}
        <group position={[0, tire.verticalOffset, 0]} rotation={[0, 0, tire.screenRoll]}>
          {/* TireOrientationPivot: origin at the globe's centre. The pivot
              holds the inclined ring at its rest pose and drifts it a few
              degrees up and down — the PRIMARY motion. The group below it
              holds the constant yaw/lean that keeps the ring plane oblique to
              the camera, and the innermost group carries the whisper of tread
              spin. */}
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

      {/* Four lights, no shadow maps. The key models the tread blocks, the
          gold rim light draws the silhouette, and the cool fill keeps the
          lower half of a black tire from disappearing into the background. */}
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
  /** False once the hero has scrolled away — the render loop stops entirely. */
  isActive: boolean;
  /** Fired when the renderer exists, so the layer can fade in rather than pop. */
  onReady?: () => void;
};

function HeroScene({ layout, motionRef, prefersReducedMotion, isActive, onReady }: HeroSceneProps) {
  const isMobile = layout === 'mobile';

  return (
    <Canvas
      // Decorative: no tab stop, no screen-reader presence, no pointer capture.
      aria-hidden="true"
      tabIndex={-1}
      style={{ width: '100%', height: '100%', pointerEvents: 'none' }}
      resize={{ offsetSize: true }}
      dpr={isMobile ? perf.dprMobile : perf.dprDesktop}
      // Reduced motion still gets the composition, just not a running loop.
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
