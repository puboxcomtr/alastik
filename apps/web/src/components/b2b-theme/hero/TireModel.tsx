'use client';

import { useLoader } from '@react-three/fiber';
import { Suspense, useEffect, useMemo, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import ProceduralTire from './ProceduralTire';
import { HERO_CONFIG } from './hero-config';

/**
 * The swappable tire.
 *
 * Renders the production model from HERO_CONFIG.modelPath when that file
 * exists, and the procedural tire otherwise — so the hero is never broken by
 * a missing asset, in development or in production. See ./README.md for the
 * format the model has to be in.
 *
 * Availability is probed with a HEAD request instead of letting the loader
 * suspend-and-throw, which keeps a missing model off the error path entirely.
 */

/** `null` while the probe is in flight. */
function useModelAvailability(path: string): boolean | null {
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);

  useEffect(() => {
    let isCancelled = false;

    fetch(path, { method: 'HEAD' })
      .then((response) => {
        if (isCancelled) {
          return;
        }

        // A dev server can answer a missing public file with an HTML 404 page,
        // so the content type is checked as well as the status.
        const contentType = response.headers.get('content-type') ?? '';
        setIsAvailable(response.ok && !contentType.includes('text/html'));
      })
      .catch(() => {
        if (!isCancelled) {
          setIsAvailable(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [path]);

  return isAvailable;
}

function GltfTire() {
  const gltf = useLoader(GLTFLoader, HERO_CONFIG.modelPath);

  const model = useMemo(() => {
    const scene = gltf.scene.clone(true);
    const bounds = new THREE.Box3().setFromObject(scene);
    const size = bounds.getSize(new THREE.Vector3());
    const centre = bounds.getCenter(new THREE.Vector3());

    // Normalize whatever the modeller exported to the scene's own scale: the
    // widest horizontal extent becomes the configured tire diameter.
    const diameter = Math.max(size.x, size.z) || 1;
    const scale = (HERO_CONFIG.tire.outerRadius * 2) / diameter;

    scene.position.set(-centre.x * scale, -centre.y * scale, -centre.z * scale);
    scene.scale.setScalar(scale);

    return scene;
  }, [gltf]);

  return <primitive object={model} />;
}

function TireModel() {
  const isModelAvailable = useModelAvailability(HERO_CONFIG.modelPath);

  if (!isModelAvailable) {
    return <ProceduralTire />;
  }

  return (
    <Suspense fallback={<ProceduralTire />}>
      <GltfTire />
    </Suspense>
  );
}

export default TireModel;
