'use client';

import { useEffect, useState } from 'react';

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
