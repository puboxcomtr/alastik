/**
 * Central tuning table for the home hero's 3D scene.
 *
 * The scene is one iconic composition: a stylized digital globe with a large
 * automotive tire fitted around it. The globe swings about its own (slightly
 * tilted) planetary axis; the tire holds its pose and only drifts a few
 * degrees. The two motions are deliberately independent — see HeroScene,
 * which drives each from its own group.
 *
 * Every magic number lives here so the look can be adjusted without reading
 * the geometry, lighting and animation code. Values are in three.js world
 * units unless a name says otherwise; the camera is set up (fov 35 at z=11)
 * so roughly 6.9 world units fill the canvas height.
 *
 * The palette is deliberately NOT invented: `gold` is the accent this site
 * already uses everywhere (hover states, focus rings, the existing hero title
 * gradient) and the background tones are the existing dark surface variables
 * from src/styles/variables.css.
 */

export const HERO_COLORS = {
  /** Art Lastik's accent, identical to the one used across the live site. */
  gold: '#e0cd00',
  /** Same accent, dimmed — used where a full-strength gold would glare. */
  goldSoft: '#7d7100',
  /** --color-background-8 */
  backgroundTop: '#070b10',
  /** Slightly lifted navy-black the rest of the site uses for dark surfaces. */
  backgroundBottom: '#101828',

  /** Rubber never goes to pure black, or the tread reads as a silhouette
   *  against an already very dark background. */
  rubber: '#1b222d',
  rubberTread: '#242c39',
  rim: '#3a4250',
  rimHighlight: '#68717f',

  /** Globe body: a deep navy in the site's own dark family — light enough
   *  that the sphere reads as a lit planet, never a black hole. */
  globeBase: '#182a42',
  /** Steel-blue fresnel edge that makes the sphere read as a sphere. */
  globeFresnel: '#70839c',
  /** Continent dots: warm off-white, with a gold minority (see GlobePoints). */
  globeDots: '#e9e6d8',
  /** Latitude/longitude/grid lines — barely-there by design. */
  globeGrid: '#39424f',
} as const;

export const HERO_CONFIG = {
  camera: {
    fov: 35,
    position: [0, 0, 11] as const,
  },

  globe: {
    radius: 1.8,
    /** Planetary axis lean (radians, about Z) — an Earth-like slant. */
    axialTilt: 0.2,
    /**
     * Lean of the whole globe toward the camera (radians, about X). This is
     * what keeps the planet readable: when the tire band covers the
     * equatorial belt, the part left visible is the upper dome — and leaning
     * the axis forward parks the dot-densest latitudes (Europe, Siberia,
     * Canada: 30-70N) on that dome instead of the empty Arctic ocean.
     */
    cameraLean: 0.38,
    /**
     * Which longitude faces the camera. latLonToVector3 puts longitude 0 on
     * +Z, and a yaw of `a` brings longitude `-a` to the front, so -1.09 rad
     * parks roughly 62E dead centre.
     *
     * 0.44 rad parks roughly 25W dead centre: the Atlantic view, with the
     * Americas on the left of the sphere and Africa and Europe on the right.
     * That pairing is the brief — both landmasses readable at once.
     *
     * Of the yaw values that show both, this is the measured best. Counting
     * land dots that end up on the near side (after cameraLean and axialTilt)
     * it is the balance point — Africa 975 dots against the Americas' 955, so
     * neither continent is a sliver — and it is also the flattest spot on the
     * curve: the swing below changes the lit dot count by only 1.2%, the
     * lowest anywhere in the range. Flatness is what stops the lights visibly
     * draining away and coming back, which is the whole reason this value is
     * measured rather than eyeballed.
     *
     * The trade is real and deliberate: the Atlantic is water, so this view
     * carries about a fifth fewer dots than the global maximum near 60E.
     * `dotDensity` below is raised to pay for it.
     */
    initialYaw: 0.44,
    /**
     * The globe does NOT run a full 360 revolution: half of every lap would
     * park the empty Pacific in front of the camera and the sphere stops
     * reading as Earth. It swings like a slow pendulum instead.
     *
     * The amplitude is deliberately TINY, and paired with `initialYaw` so both
     * extremes stay on the same continental face. At the old +-90deg the swing
     * dragged the Atlantic across the front on every pass and the continent
     * dots and network lights drained away and came back — the planet kept
     * going dark.
     *
     * The margin is far smaller than it looks: the tire band already covers
     * the equatorial belt, so continents only ever show on the upper dome.
     *
     * Measured, not guessed. Counting upper-dome land dots across this swing:
     * centred at 30E it ran 1676 / 1518 / 1433 — a 14.5% drain and refill,
     * which is exactly the "lights keep leaving" everyone could see. At the
     * Atlantic centre this config actually ships (see `initialYaw`) the same
     * +-13deg holds inside 1.2%.
     *
     * So the swing is parallax now rather than travel, and the travelling arc
     * pulses carry the motion instead.
     */
    swingAmplitude: 0.22,
    /** Seconds for one full there-and-back swing. */
    rotationSeconds: 64,
    /** Continent dots per land cell at the equator, per layout. Raised ~22%
     *  to offset the Atlantic view chosen in `initialYaw`, which shows less
     *  land than the densest possible face. One draw call either way. */
    dotDensity: { desktop: 11, tablet: 8, mobile: 5.5 },
    /** Fraction of continent dots tinted gold instead of warm white. */
    goldDotRatio: 0.2,
    /**
     * Points are sized in world units (sizeAttenuation), so a small value can
     * land near or below one device pixel once the renderer's DPR is clamped.
     * When that happens the field only stays readable where dots pile up —
     * along the silhouette — and the lit face looks empty even though every
     * dot is being drawn. Sized up so a single dot survives on its own.
     */
    dotSize: 0.052,
    /** Grid: parallels every 30deg of latitude, meridians every 30deg. */
    gridOpacity: 0.15,
    /** Atmosphere halo just outside the sphere. Gold, but restrained. */
    atmosphereScale: 1.07,
    atmosphereStrength: 0.24,
    /** Supply-network arcs (see globe-geo.ts for the route list). */
    arcOpacity: 0.44,
    arcLift: 0.18,
    /** Seconds for a pulse to travel one arc end to end. */
    arcPulseSeconds: 5,
    /** Travelling lights per route — like little aircraft on a flight path.
     *  Three keeps a route lit end to end instead of leaving long empty
     *  stretches between blips. */
    pulsesPerArc: 3,
    nodeSize: 0.055,
  },

  tire: {
    /** Outer (tread) radius of the base tire geometry. */
    outerRadius: 2.26,
    /** Where the sidewall meets the rim flange. */
    beadRadius: 1.24,
    /** Half of the section width, i.e. how deep the tire is. */
    halfWidth: 0.5,
    /** Widest point of the sidewall bulge, as a ratio of halfWidth. */
    sidewallBulge: 1.16,
    /** Radial segments of the revolved carcass. Higher = rounder silhouette. */
    radialSegments: 128,
    /** Tread pattern columns around the circumference. */
    treadBlockCount: 80,
    /** Circumferential grooves cut into the tread band. */
    treadGrooveCount: 4,
    /** Spokes on the procedural rim. */
    rimSpokeCount: 8,

    /**
     * Scale that fits the tire around the globe: the bead opening lands just
     * inside the globe's surface (1.24 x 1.41 = 1.75 vs globe radius 1.8),
     * so the sphere bulges through the opening and the two visibly interlock
     * — wrapped tightly, not floating.
     */
    fittedScale: 1.41,

    /**
     * PRIMARY MOTION — the ring HOLDS its pose.
     *
     * The tire is an inclined ring around the globe's centre. It used to sweep
     * a full lap around the planet; it deliberately no longer does. The
     * orientation PIVOT parks the ring at `restPhase` — the signature pose the
     * whole composition is built around — and only breathes a few degrees up
     * and down about the horizontal (X) axis. The near arc therefore stays in
     * front of the continents and the far arc stays behind them for good, with
     * real depth testing still doing the occlusion. `baseTiltY`/`baseTiltZ`
     * hold the ring plane obliquely to the camera, so it reads as a 3/4 view.
     */
    baseTiltY: 0.5,
    baseTiltZ: 0.16,
    /**
     * Roll of the whole ring in the CAMERA's frame, in radians. Positive drops
     * the left side and lifts the right. This is applied on the outermost
     * group of the tire chain, which is the only place a Z rotation is a true
     * screen-space roll — `baseTiltZ` above sits under the pivot's tumble, so
     * it tilts the ring in its own frame and cannot be reasoned about by eye.
     */
    screenRoll: 0.2,
    /** Lift of the ring above the globe's centre, in world units. Small: push
     *  it much further and the sphere stops sitting inside the opening. */
    verticalOffset: 0.14,
    /**
     * The pose the ring rests at: wrapping the globe's middle with the dotted
     * dome rising above it. Just off edge-on, because dead flat (0) reduces
     * the tire to a hairline and loses the tread entirely. HeroScene starts
     * the drift clock only once the tire has finished fading in, so this is
     * exactly what a visitor sees on the first frame they can see anything.
     */
    restPhase: 0.22,
    /**
     * How far the ring drifts either side of `restPhase`, in radians. ~3.5deg
     * — enough that the scene never freezes into a still image, small enough
     * that the pose itself never visibly changes.
     */
    driftAmplitude: 0.06,
    /** Seconds for one full down-and-up drift. */
    driftSeconds: 15,
    /** An even smaller, slower sway about the vertical axis, so the drift is
     *  not obviously a single mechanical hinge. */
    swayAmplitude: 0.03,
    swaySeconds: 23,

    /** SECONDARY MOTION — a whisper of tread rotation about the tire's own
     *  axle. Deliberately near-static; the precession must dominate. */
    treadSpinSeconds: 64,

    /** Vertical float of the whole composition, in world units. */
    floatAmplitude: 0.07,
    floatSeconds: 9,
  },

  /** Where the composition sits relative to the canvas centre, per layout. */
  placement: {
    desktop: { x: -0.2, y: -0.9, scale: 0.72 },
    tablet: { x: 0, y: -0.8, scale: 0.62 },
    /**
     * Phones give the composition its own band above the copy (see Hero.tsx),
     * so it no longer hides in the lower third — it fills its band. The small
     * negative y drops the tire's top edge clear of the fixed header: the
     * canvas shows 6.94 world units of height whatever its pixel size, the
     * 68px header eats the top 1.43 of them at a 330px band, and the tire's
     * radius here is 2.49.
     */
    mobile: { x: 0, y: -0.45, scale: 0.78 },
  },

  orbits: {
    /** Radius, tilt (x), yaw (y), seconds per revolution, opacity. */
    rings: [
      { radius: 3.4, tiltX: 1.16, tiltY: 0.22, seconds: 46, opacity: 0.32 },
      { radius: 3.75, tiltX: -0.92, tiltY: -0.4, seconds: 62, opacity: 0.24 },
      { radius: 4.15, tiltX: 1.42, tiltY: 0.62, seconds: 78, opacity: 0.2 },
      { radius: 4.55, tiltX: -1.24, tiltY: 0.14, seconds: 94, opacity: 0.16 },
      { radius: 4.95, tiltX: 1.02, tiltY: -0.72, seconds: 118, opacity: 0.12 },
    ],
    /** Tube radius of the thin torus used to draw each ring. */
    thickness: 0.0062,
    /** Rings are dropped from the end of the list on smaller screens. */
    mobileCount: 2,
    tabletCount: 4,
  },

  particles: {
    desktopCount: 190,
    tabletCount: 130,
    mobileCount: 55,
    /** Spread of the point cloud around the origin. */
    spread: { x: 13, y: 8, z: 7 },
    minSize: 0.012,
    maxSize: 0.042,
    /** Seconds for the cloud to make one full, barely perceptible turn. */
    rotationSeconds: 220,
    driftAmplitude: 0.12,
    driftSeconds: 15,
    opacity: 0.55,
  },

  lighting: {
    ambientIntensity: 0.7,
    /** Main white key that models the tread blocks. */
    key: { position: [5, 6, 4.5] as const, intensity: 3.1 },
    /** Gold rim light from behind — this is what draws the silhouette. */
    rim: { position: [-5.5, 2, -3.8] as const, intensity: 5 },
    /** Cool fill so the lower half of the tire never goes fully black. */
    fill: { position: [-0.5, -3, 3.8] as const, intensity: 1.15, color: '#8f9cb5' },
  },

  pointer: {
    /** Maximum extra rotation from the mouse, in radians. Deliberately small:
     *  the scene should gain depth, not feel like a model viewer. Applied to
     *  the outer parallax group only — never to the globe or tire spins. */
    maxYaw: 0.115,
    maxPitch: 0.075,
    /** Per-frame lerp factor at 60fps; lower is smoother/lazier. */
    damping: 0.045,
  },

  scroll: {
    /** Extra tilt the tire ring picks up across the hero's scroll range, in
     *  revolutions. A nudge (~7deg), not a turn: scrolling must not undo the
     *  rest pose either. */
    extraTurns: 0.02,
    scaleTo: 0.9,
    /** World units the composition drifts up and right as the hero leaves. */
    translateY: 0.85,
    translateX: 0.35,
    orbitOpacityTo: 0.15,
  },

  intro: {
    /** All values in seconds, measured from scene mount. Text is NOT gated on
     *  this — see Hero.tsx, which reveals copy on the site's normal cadence so
     *  LCP is unaffected. */
    particlesIn: { at: 0.05, duration: 0.55 },
    globeIn: { at: 0.3, duration: 0.75 },
    globeFromScale: 0.9,
    /** Continent dots, grid, network arcs. */
    detailsIn: { at: 0.6, duration: 0.65 },
    tireIn: { at: 0.85, duration: 0.8 },
    tireFromScale: 0.88,
    tireFromSpin: -0.3,
    orbitsIn: { at: 1.1, duration: 0.5, stagger: 0.11 },
    labelsIn: { at: 1.18, duration: 0.45, stagger: 0.09 },
  },

  performance: {
    /** Never render at a Mac Retina 2x/3x full-screen resolution. */
    dprDesktop: [1, 1.5] as [number, number],
    dprMobile: [1, 1.25] as [number, number],
    /** Antialiasing is a real cost on mobile GPUs for little visual gain here. */
    antialiasOnMobile: false,
  },

  /**
   * Drop a production tire model at this path and TireModel picks it up
   * automatically; the procedural tire is used until then. See the README
   * note in this folder for the expected format.
   */
  modelPath: '/models/artlastik-tire.glb',
} as const;

export type HeroLayout = 'mobile' | 'tablet' | 'desktop';
