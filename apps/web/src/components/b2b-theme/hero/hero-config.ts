
export const HERO_COLORS = {
  gold: '#e0cd00',
  goldSoft: '#7d7100',
  backgroundTop: '#070b10',
  backgroundBottom: '#101828',

  rubber: '#1b222d',
  rubberTread: '#242c39',
  rim: '#3a4250',
  rimHighlight: '#68717f',

  globeBase: '#182a42',
  globeFresnel: '#70839c',
  globeDots: '#e9e6d8',
  globeGrid: '#39424f',
} as const;

export const HERO_CONFIG = {
  camera: {
    fov: 35,
    position: [0, 0, 11] as const,
  },

  globe: {
    radius: 1.8,
    axialTilt: 0.2,
    cameraLean: 0.38,
    initialYaw: 0.44,
    swingAmplitude: 0.22,
    rotationSeconds: 64,
    dotDensity: { desktop: 11, tablet: 8, mobile: 5.5 },
    goldDotRatio: 0.2,
    dotSize: 0.052,
    gridOpacity: 0.15,
    atmosphereScale: 1.07,
    atmosphereStrength: 0.24,
    arcOpacity: 0.44,
    arcLift: 0.18,
    arcPulseSeconds: 5,
    pulsesPerArc: 3,
    nodeSize: 0.055,
  },

  tire: {
    outerRadius: 2.26,
    beadRadius: 1.24,
    halfWidth: 0.5,
    sidewallBulge: 1.16,
    radialSegments: 128,
    treadBlockCount: 80,
    treadGrooveCount: 4,
    rimSpokeCount: 8,

    fittedScale: 1.41,

    baseTiltY: 0.5,
    baseTiltZ: 0.16,
    screenRoll: 0.2,
    verticalOffset: 0.14,
    restPhase: 0.22,
    driftAmplitude: 0.06,
    driftSeconds: 15,
    swayAmplitude: 0.03,
    swaySeconds: 23,

    treadSpinSeconds: 64,

    floatAmplitude: 0.07,
    floatSeconds: 9,
  },

  placement: {
    desktop: { x: -0.2, y: -0.9, scale: 0.72 },
    tablet: { x: 0, y: -0.8, scale: 0.62 },
    mobile: { x: 0, y: -0.45, scale: 0.78 },
  },

  orbits: {
    rings: [
      { radius: 3.4, tiltX: 1.16, tiltY: 0.22, seconds: 46, opacity: 0.32 },
      { radius: 3.75, tiltX: -0.92, tiltY: -0.4, seconds: 62, opacity: 0.24 },
      { radius: 4.15, tiltX: 1.42, tiltY: 0.62, seconds: 78, opacity: 0.2 },
      { radius: 4.55, tiltX: -1.24, tiltY: 0.14, seconds: 94, opacity: 0.16 },
      { radius: 4.95, tiltX: 1.02, tiltY: -0.72, seconds: 118, opacity: 0.12 },
    ],
    thickness: 0.0062,
    mobileCount: 2,
    tabletCount: 4,
  },

  particles: {
    desktopCount: 190,
    tabletCount: 130,
    mobileCount: 55,
    spread: { x: 13, y: 8, z: 7 },
    minSize: 0.012,
    maxSize: 0.042,
    rotationSeconds: 220,
    driftAmplitude: 0.12,
    driftSeconds: 15,
    opacity: 0.55,
  },

  lighting: {
    ambientIntensity: 0.7,
    key: { position: [5, 6, 4.5] as const, intensity: 3.1 },
    rim: { position: [-5.5, 2, -3.8] as const, intensity: 5 },
    fill: { position: [-0.5, -3, 3.8] as const, intensity: 1.15, color: '#8f9cb5' },
  },

  pointer: {
    maxYaw: 0.115,
    maxPitch: 0.075,
    damping: 0.045,
  },

  scroll: {
    extraTurns: 0.02,
    scaleTo: 0.9,
    translateY: 0.85,
    translateX: 0.35,
    orbitOpacityTo: 0.15,
  },

  intro: {
    particlesIn: { at: 0.05, duration: 0.55 },
    globeIn: { at: 0.3, duration: 0.75 },
    globeFromScale: 0.9,
    detailsIn: { at: 0.6, duration: 0.65 },
    tireIn: { at: 0.85, duration: 0.8 },
    tireFromScale: 0.88,
    tireFromSpin: -0.3,
    orbitsIn: { at: 1.1, duration: 0.5, stagger: 0.11 },
    labelsIn: { at: 1.18, duration: 0.45, stagger: 0.09 },
  },

  performance: {
    dprDesktop: [1, 1.5] as [number, number],
    dprMobile: [1, 1.25] as [number, number],
    antialiasOnMobile: false,
  },

  modelPath: '/models/artlastik-tire.glb',
} as const;

export type HeroLayout = 'mobile' | 'tablet' | 'desktop';
