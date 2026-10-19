'use client';

import { useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { HERO_COLORS, HERO_CONFIG } from './hero-config';

const { tire } = HERO_CONFIG;

const BAND_RADIUS = tire.outerRadius - 0.035;

const BAND_TOP = tire.halfWidth * 0.62;

const GROOVE_HALF_WIDTH = tire.halfWidth * 0.036;
const GROOVE_DEPTH = 0.085;

const SIPE_COLUMNS = 72;

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

  push(bead, -width * 0.86);
  push(bead, width * 0.86);

  push(bead * 1.04, width * 0.95);
  bend([bead * 1.04, width * 0.95], [bulge, width * 1.12], [BAND_RADIUS * 0.97, width * 0.9], 10);
  bend(
    [BAND_RADIUS * 0.97, width * 0.9],
    [BAND_RADIUS, width * 0.82],
    [BAND_RADIUS, width * 0.62],
    5,
  );

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
    dummy.rotation.order = 'YZX';

    const columnStep = (Math.PI * 2) / SIPE_COLUMNS;
    const ribAxialWidth = (BAND_TOP * 2) / (tire.treadGrooveCount + 1) - GROOVE_HALF_WIDTH * 2;
    let index = 0;

    for (let column = 0; column < SIPE_COLUMNS; column += 1) {
      SIPE_RIBS.forEach((rib) => {
        const theta = (column + rib.stagger) * columnStep;
        const radial = BAND_RADIUS + 0.004;

        dummy.position.set(Math.cos(theta) * radial, rib.centre * tire.halfWidth, Math.sin(theta) * radial);
        dummy.rotation.set(0, Math.PI / 2 - theta, rib.tilt);
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
      <mesh castShadow={false} receiveShadow={false}>
        <latheGeometry args={[profile, tire.radialSegments]} />
        <meshStandardMaterial color={HERO_COLORS.rubber} roughness={0.86} metalness={0.02} />
      </mesh>

      <instancedMesh ref={sipeRef} args={[sipeGeometry, undefined, sipeInstanceCount]} frustumCulled={false}>
        <meshBasicMaterial color="#070a10" toneMapped={false} />
      </instancedMesh>

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
