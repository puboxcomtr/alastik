'use client';

import { useEffect, useState } from 'react';

/**
 * Whether this device can actually run the hero scene.
 *
 * `null` means "not decided yet" — the caller renders the static fallback in
 * that window, so a device that cannot do WebGL never sees an empty hero and
 * never pays for the three.js chunk.
 *
 * The probe creates a throwaway context and immediately releases it, because
 * browsers cap the number of live WebGL contexts per page and the real canvas
 * needs one of those slots.
 */
export function useWebGLSupport(): boolean | null {
  const [isSupported, setIsSupported] = useState<boolean | null>(null);

  useEffect(() => {
    let canvas: HTMLCanvasElement | null = null;

    try {
      canvas = document.createElement('canvas');
      const context = (canvas.getContext('webgl2') ||
        canvas.getContext('webgl')) as WebGLRenderingContext | WebGL2RenderingContext | null;

      if (!context) {
        setIsSupported(false);

        return;
      }

      // Release the probe context straight away so it does not count against
      // the browser's per-page context budget.
      context.getExtension('WEBGL_lose_context')?.loseContext();
      setIsSupported(true);
    } catch {
      setIsSupported(false);
    } finally {
      canvas = null;
    }
  }, []);

  return isSupported;
}

export default useWebGLSupport;
