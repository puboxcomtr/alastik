'use client';

import { useEffect, useRef } from 'react';
import { useSettings } from '@/src/context/SettingsContext';

const FLAKES_PER_100PX = 3;
const MAX_FLAKES = 55;
const FRAME_INTERVAL_MS = 33;
const FLAKE_FILL = 'rgba(255, 255, 255, 0.95)';
const FLAKE_GLOW = 'rgba(110, 140, 180, 0.55)';

type Flake = { x: number; y: number; radius: number; speed: number; drift: number; phase: number };

export default function SnowEffect() {
    const { theme } = useSettings();
    const enabled = theme?.snowEffect === true;
    const canvasRef = useRef<HTMLCanvasElement | null>(null);

    useEffect(() => {
        if (!enabled) return;
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!canvas || !ctx) return;

        let width = 0;
        let height = 0;
        let flakes: Flake[] = [];
        let frameId = 0;
        let lastFrame = 0;

        const createFlake = (startAbove: boolean): Flake => ({
            x: Math.random() * width,
            y: startAbove ? -10 : Math.random() * height,
            radius: 1 + Math.random() * 2,
            speed: 0.35 + Math.random() * 0.75,
            drift: 0.2 + Math.random() * 0.5,
            phase: Math.random() * Math.PI * 2
        });

        const resize = () => {
            const ratio = Math.min(window.devicePixelRatio || 1, 2);
            width = window.innerWidth;
            height = window.innerHeight;
            canvas.width = Math.round(width * ratio);
            canvas.height = Math.round(height * ratio);
            ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
            const count = Math.min(MAX_FLAKES, Math.round((width / 100) * FLAKES_PER_100PX));
            flakes = Array.from({ length: count }, () => createFlake(false));
        };

        const draw = (now: number) => {
            frameId = window.requestAnimationFrame(draw);
            if (now - lastFrame < FRAME_INTERVAL_MS) return;
            const step = lastFrame ? Math.min((now - lastFrame) / 16.7, 4) : 1;
            lastFrame = now;

            ctx.clearRect(0, 0, width, height);
            ctx.fillStyle = FLAKE_FILL;
            ctx.shadowColor = FLAKE_GLOW;
            ctx.shadowBlur = 4;
            for (const flake of flakes) {
                flake.y += flake.speed * step;
                flake.phase += 0.01 * step;
                flake.x += Math.sin(flake.phase) * flake.drift * step;
                if (flake.y > height + 10) Object.assign(flake, createFlake(true));
                if (flake.x < -10) flake.x = width + 10;
                else if (flake.x > width + 10) flake.x = -10;
                ctx.beginPath();
                ctx.arc(flake.x, flake.y, flake.radius, 0, Math.PI * 2);
                ctx.fill();
            }
        };

        const start = () => {
            if (frameId) return;
            lastFrame = 0;
            frameId = window.requestAnimationFrame(draw);
        };
        const stop = () => {
            window.cancelAnimationFrame(frameId);
            frameId = 0;
        };
        const onVisibility = () => (document.hidden ? stop() : start());

        resize();
        start();
        window.addEventListener('resize', resize);
        document.addEventListener('visibilitychange', onVisibility);

        return () => {
            stop();
            window.removeEventListener('resize', resize);
            document.removeEventListener('visibilitychange', onVisibility);
        };
    }, [enabled]);

    if (!enabled) return null;

    return (
        <canvas
            ref={canvasRef}
            aria-hidden="true"
            className="position-fixed top-0 start-0 w-100 h-100 pe-none"
            style={{ zIndex: 1035 }}
        />
    );
}
