'use client';

import { useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { HERO_COLORS, HERO_CONFIG } from './hero-config';

/**
 * The development / no-asset tire.
 *
 * This is a real solid of revolution rather than a torus: the profile below
 * describes an actual tire cross-section (bead, sidewall bulge, shoulder
 * round, tread band), which is what makes the silhouette read as a tire
 * instead of a doughnut.
 *
 * The tread is a touring/summer pattern, modelled on the reference the
 * client supplied: four wide circumferential grooves cut into the lathe
 * profile divide the band into five smooth ribs, and each rib carries a
 * sweep of thin diagonal sipes — drawn as ONE InstancedMesh of dark slivers,
 * so the whole pattern costs a single draw call. No blocky off-road tread,
 * no sidewall lettering.
 *
 * It is a stand-in. Drop a production model at HERO_CONFIG.modelPath and
 * TireModel renders that instead, with no other change to the scene.
 *
 * The mesh is built around its own Y axis (a wheel lying flat). Orientation
 * and motion belong to the parent groups in HeroScene, so a GLB swap
 * inherits exactly the same behaviour.
 */

const { tire } = HERO_CONFIG;

/** Radius of the rib surface the sipes sit on. */
const BAND_RADIUS = tire.outerRadius - 0.035;

/** Half the tread band's axial extent. */
const BAND_TOP = tire.halfWidth * 0.62;

/** Circumferential groove sizing — wide and deep enough to read as the
 *  reference's four black channels. */
const GROOVE_HALF_WIDTH = tire.halfWidth * 0.036;
const GROOVE_DEPTH = 0.085;

/** Sipe columns around the circumference, per rib. */
const SIPE_COLUMNS = 72;

/**
 * The five ribs between the four grooves. `centre` is the rib's axial
 * middle as a fraction of halfWidth; `tilt` is the diagonal sweep of its
 * sipes (all one direction, like the reference), steeper toward the
 * shoulders; `stagger` phase-shifts neighbouring ribs so the sipes never
 * line up into a ladder.
 */
const SIPE_RIBS = [
  { centre: -0.496, tilt: 0.5, stagger: 0.0 },
  { centre: -0.248, tilt: 0.4, stagger: 0.35 },
  { centre: 0, tilt: 0.32, stagger: 0.7 },
  { centre: 0.248, tilt: 0.4, stagger: 0.15 },
  { centre: 0.496, tilt: 0.5, stagger: 0.5 },
] as const;

function buildTireProfile(): THREE.Vector2[] {
  const points: THREE.Vector2[] = [];
  const width = tire.halfWidth;
  const bead = tire.beadRadius;
  const bulge = bead * 1.62;

  const push = (radius: number, axial: number) => points.push(new THREE.Vector2(radius, axial));

  /** Samples a quadratic bend so the sidewall curves instead of creasing. */
  const bend = (
    from: [number, number],
    control: [number, number],
    to: [number, number],
    steps: number,
  ) => {
    for (let step = 1; step <= steps; step += 1) {
      const t = step / steps;
      const inverse = 1 - t;
      const radius = inverse * inverse * from[0] + 2 * inverse * t * control[0] + t * t * to[0];
      const axial = inverse * inverse * from[1] + 2 * inverse * t * control[1] + t * t * to[1];
      push(radius, axial);
    }
  };

  // --- inner wall, bottom bead to top bead (hidden behind the rim) ---
  push(bead, -width * 0.86);
  push(bead, width * 0.86);

  // --- top bead out to the shoulder ---
  push(bead * 1.04, width * 0.95);
  bend([bead * 1.04, width * 0.95], [bulge, width * 1.12], [BAND_RADIUS * 0.97, width * 0.9], 10);
  bend(
    [BAND_RADIUS * 0.97, width * 0.9],
    [BAND_RADIUS, width * 0.82],
    [BAND_RADIUS, width * 0.62],
    5,
  );

  // --- tread band: five smooth ribs split by four wide grooves ---
  const grooves = tire.treadGrooveCount;
  const step = (BAND_TOP * 2) / (grooves + 1);

  for (let index = 1; index <= grooves; index += 1) {
    const centre = BAND_TOP - step * index;
    push(BAND_RADIUS, centre + GROOVE_HALF_WIDTH);
    push(BAND_RADIUS - GROOVE_DEPTH, centre + GROOVE_HALF_WIDTH * 0.45);
    push(BAND_RADIUS - GROOVE_DEPTH, centre - GROOVE_HALF_WIDTH * 0.45);
    push(BAND_RADIUS, centre - GROOVE_HALF_WIDTH);
  }

  push(BAND_RADIUS, -BAND_TOP);

  // --- shoulder down to the bottom bead, mirroring the top ---
  bend(
    [BAND_RADIUS, -BAND_TOP],
    [BAND_RADIUS, -width * 0.82],
    [BAND_RADIUS * 0.97, -width * 0.9],
    5,
  );
  bend(
    [BAND_RADIUS * 0.97, -width * 0.9],
    [bulge, -width * 1.12],
    [bead * 1.04, -width * 0.95],
    10,
  );
  push(bead, -width * 0.86);

  return points;
}

function ProceduralTire() {
  const sipeRef = useRef<THREE.InstancedMesh>(null);
  const spokeRef = useRef<THREE.InstancedMesh>(null);

  const profile = useMemo(buildTireProfile, []);

  // Unit box; every sipe gets its true size via per-instance scale.
  const sipeGeometry = useMemo(() => new THREE.BoxGeometry(1, 1, 1), []);

  const sipeInstanceCount = SIPE_COLUMNS * SIPE_RIBS.length;

  const rimProfile = useMemo(() => {
    const width = tire.halfWidth;
    const bead = tire.beadRadius;

    return [
      new THREE.Vector2(bead * 0.16, -width * 0.42),
      new THREE.Vector2(bead * 0.16, width * 0.34),
      new THREE.Vector2(bead * 0.44, width * 0.46),
      new THREE.Vector2(bead * 0.9, width * 0.72),
      new THREE.Vector2(bead * 0.99, width * 0.9),
      new THREE.Vector2(bead * 1.01, width * 0.72),
      new THREE.Vector2(bead * 0.96, width * 0.5),
      new THREE.Vector2(bead * 0.96, -width * 0.5),
      new THREE.Vector2(bead * 1.01, -width * 0.72),
      new THREE.Vector2(bead * 0.99, -width * 0.9),
      new THREE.Vector2(bead * 0.9, -width * 0.72),
      new THREE.Vector2(bead * 0.44, -width * 0.46),
      new THREE.Vector2(bead * 0.16, -width * 0.42),
    ];
  }, []);

  const spokeGeometry = useMemo(
    () => new THREE.BoxGeometry(tire.beadRadius * 0.26, tire.halfWidth * 0.34, tire.beadRadius * 0.78),
    [],
  );

  useLayoutEffect(() => {
    const mesh = sipeRef.current;

    if (!mesh) {
      return;
    }

    const dummy = new THREE.Object3D();
    // Face outward first (Y), then sweep the sipe diagonally in the surface
    // plane about the new radial axis (Z) — 'YZX' applies exactly that order.
    dummy.rotation.order = 'YZX';

    const columnStep = (Math.PI * 2) / SIPE_COLUMNS;
    const ribAxialWidth = (BAND_TOP * 2) / (tire.treadGrooveCount + 1) - GROOVE_HALF_WIDTH * 2;
    let index = 0;

    for (let column = 0; column < SIPE_COLUMNS; column += 1) {
      SIPE_RIBS.forEach((rib) => {
        const theta = (column + rib.stagger) * columnStep;
        // A hair proud of the rib so the dark sliver always wins the surface.
        const radial = BAND_RADIUS + 0.004;

        dummy.position.set(Math.cos(theta) * radial, rib.centre * tire.halfWidth, Math.sin(theta) * radial);
        // RotY(a) sends local +Z to (sin a, 0, cos a); outward radial at theta
        // is (cos t, 0, sin t) — so a = PI/2 - t. The Z component then tilts
        // the sipe into its diagonal sweep.
        dummy.rotation.set(0, Math.PI / 2 - theta, rib.tilt);
        // x thin along the circumference, y spanning most of the rib, z a
        // shallow bite into the surface.
        dummy.scale.set(0.016, ribAxialWidth * 0.92, 0.02);
        dummy.updateMatrix();
        mesh.setMatrixAt(index, dummy.matrix);
        index += 1;
      });
    }

    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, []);

  useLayoutEffect(() => {
    const mesh = spokeRef.current;

    if (!mesh) {
      return;
    }

    const dummy = new THREE.Object3D();
    const radius = tire.beadRadius * 0.55;

    for (let spoke = 0; spoke < tire.rimSpokeCount; spoke += 1) {
      const angle = (spoke / tire.rimSpokeCount) * Math.PI * 2;

      // The spoke's long axis (local +Z) points out from the hub.
      dummy.position.set(Math.cos(angle) * radius, tire.halfWidth * 0.3, Math.sin(angle) * radius);
      dummy.rotation.set(0, Math.PI / 2 - angle, 0);
      dummy.updateMatrix();
      mesh.setMatrixAt(spoke, dummy.matrix);
    }

    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, []);

  useLayoutEffect(
    () => () => {
      sipeGeometry.dispose();
      spokeGeometry.dispose();
    },
    [sipeGeometry, spokeGeometry],
  );

  return (
    <group>
      {/* Carcass: sidewalls, shoulders and the groove-cut tread band. */}
      <mesh castShadow={false} receiveShadow={false}>
        <latheGeometry args={[profile, tire.radialSegments]} />
        <meshStandardMaterial color={HERO_COLORS.rubber} roughness={0.86} metalness={0.02} />
      </mesh>

      {/* Diagonal sipes: thin near-black slivers laid across each rib. Unlit
          on purpose — a groove reads as darkness, whatever the light does. */}
      <instancedMesh ref={sipeRef} args={[sipeGeometry, undefined, sipeInstanceCount]} frustumCulled={false}>
        <meshBasicMaterial color="#070a10" toneMapped={false} />
      </instancedMesh>

      {/* Rim: flange dish, spokes and hub. */}
      <mesh>
        <latheGeometry args={[rimProfile, 64]} />
        <meshStandardMaterial color={HERO_COLORS.rim} roughness={0.3} metalness={0.82} />
      </mesh>
      <instancedMesh ref={spokeRef} args={[spokeGeometry, undefined, tire.rimSpokeCount]} frustumCulled={false}>
        <meshStandardMaterial color={HERO_COLORS.rimHighlight} roughness={0.26} metalness={0.88} />
      </instancedMesh>
      <mesh position={[0, tire.halfWidth * 0.46, 0]}>
        <cylinderGeometry args={[tire.beadRadius * 0.2, tire.beadRadius * 0.24, tire.halfWidth * 0.3, 32]} />
        <meshStandardMaterial color={HERO_COLORS.rim} roughness={0.24} metalness={0.9} />
      </mesh>
    </group>
  );
}

export default ProceduralTire;
