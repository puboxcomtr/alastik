import * as THREE from 'three';

type Run = readonly [number, number];

const CELL_DEGREES = 5;
const COLUMNS = 72;
const ROWS = 36;

const LAND_RUNS: readonly (readonly Run[])[] = [
   [[28, 29]],
   [[21, 30]],
   [
    [20, 31],
    [55, 57],
  ],
   [
    [16, 31],
    [39, 70],
  ],
   [
    [2, 8],
    [10, 24],
    [26, 30],
    [32, 33],
    [38, 71],
  ],
   [
    [2, 9],
    [10, 24],
    [27, 29],
    [38, 71],
  ],
   [
    [3, 8],
    [10, 18],
    [21, 25],
    [34, 34],
    [39, 70],
  ],
   [
    [10, 18],
    [21, 24],
    [34, 35],
    [36, 66],
  ],
   [
    [12, 24],
    [35, 66],
  ],
   [
    [12, 23],
    [34, 44],
    [46, 64],
  ],
   [
    [12, 22],
    [34, 35],
    [37, 37],
    [39, 40],
    [42, 44],
    [46, 62],
    [64, 64],
  ],
   [
    [13, 21],
    [34, 40],
    [41, 46],
    [47, 52],
    [54, 62],
  ],
   [
    [13, 16],
    [19, 19],
    [33, 42],
    [44, 48],
    [50, 54],
    [56, 61],
  ],
   [
    [13, 17],
    [19, 20],
    [33, 42],
    [44, 48],
    [50, 54],
    [57, 62],
  ],
   [
    [14, 18],
    [33, 42],
    [44, 47],
    [50, 53],
    [56, 60],
    [62, 63],
  ],
   [
    [15, 17],
    [32, 40],
    [41, 49],
    [51, 52],
    [56, 60],
    [62, 62],
  ],
   [
    [16, 20],
    [33, 46],
    [48, 48],
    [52, 52],
    [55, 57],
    [59, 61],
  ],
   [
    [19, 26],
    [38, 46],
    [55, 57],
    [59, 61],
    [63, 66],
  ],
   [
    [19, 28],
    [38, 45],
    [56, 60],
    [62, 66],
  ],
   [
    [20, 28],
    [38, 45],
    [56, 59],
    [62, 66],
  ],
   [
    [20, 28],
    [38, 44],
    [60, 64],
  ],
   [
    [20, 27],
    [38, 44],
    [45, 46],
    [58, 66],
  ],
   [
    [21, 26],
    [39, 43],
    [45, 45],
    [58, 66],
  ],
   [
    [22, 25],
    [39, 43],
    [58, 66],
  ],
   [
    [22, 24],
    [39, 42],
    [59, 65],
  ],
   [
    [22, 24],
    [40, 40],
    [64, 65],
    [69, 70],
  ],
   [
    [22, 23],
    [65, 65],
    [69, 70],
  ],
   [
    [22, 23],
    [68, 69],
  ],
   [[22, 23]],
   [],
   [],
   [],
   [],
   [],
   [],
   [],
];

export function latLonToVector3(latDeg: number, lonDeg: number, radius: number): THREE.Vector3 {
  const lat = THREE.MathUtils.degToRad(latDeg);
  const lon = THREE.MathUtils.degToRad(lonDeg);

  return new THREE.Vector3(
    radius * Math.cos(lat) * Math.sin(lon),
    radius * Math.sin(lat),
    radius * Math.cos(lat) * Math.cos(lon),
  );
}

export type GlobePointCloud = {
  positions: Float32Array;
  colors: Float32Array;
  count: number;
};

export function buildContinentPoints(
  radius: number,
  equatorDensity: number,
  baseColor: string,
  accentColor: string,
  accentRatio: number,
): GlobePointCloud {
  const base = new THREE.Color(baseColor);
  const accent = new THREE.Color(accentColor);
  const positions: number[] = [];
  const colors: number[] = [];

  for (let row = 0; row < ROWS; row += 1) {
    const latTop = 90 - row * CELL_DEGREES;

    for (const [firstColumn, lastColumn] of LAND_RUNS[row]) {
      for (let column = firstColumn; column <= lastColumn && column < COLUMNS; column += 1) {
        const lonLeft = -180 + column * CELL_DEGREES;
        const latCentre = latTop - CELL_DEGREES / 2;
        const dotTarget = equatorDensity * Math.max(0.18, Math.cos(THREE.MathUtils.degToRad(latCentre)));
        const dots = Math.floor(dotTarget) + (Math.random() < dotTarget % 1 ? 1 : 0);

        for (let dot = 0; dot < dots; dot += 1) {
          const lat = latTop - Math.random() * CELL_DEGREES;
          const lon = lonLeft + Math.random() * CELL_DEGREES;
          const point = latLonToVector3(lat, lon, radius);

          positions.push(point.x, point.y, point.z);

          const color = Math.random() < accentRatio ? accent : base;
          const brightness = 0.75 + Math.random() * 0.25;
          colors.push(color.r * brightness, color.g * brightness, color.b * brightness);
        }
      }
    }
  }

  const landDotCount = positions.length / 3;
  const oceanDotCount = Math.round(landDotCount * 0.14);

  for (let dot = 0; dot < oceanDotCount; dot += 1) {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const sinPhi = Math.sin(phi);

    positions.push(
      radius * sinPhi * Math.cos(theta),
      radius * Math.cos(phi),
      radius * sinPhi * Math.sin(theta),
    );

    const brightness = 0.22 + Math.random() * 0.12;
    colors.push(base.r * brightness, base.g * brightness, base.b * brightness);
  }

  return {
    positions: new Float32Array(positions),
    colors: new Float32Array(colors),
    count: positions.length / 3,
  };
}

export const NETWORK_NODES: readonly { lat: number; lon: number }[] = [
  { lat: 41, lon: 29 },
  { lat: 53.5, lon: 10 },
  { lat: 40.7, lon: -74 },
  { lat: 25.2, lon: 55.3 },
  { lat: 1.3, lon: 103.8 },
  { lat: -23.5, lon: -46.6 },
  { lat: -26.2, lon: 28 },
];

export const NETWORK_ARCS: readonly (readonly [number, number])[] = [
  [0, 1],
  [0, 2],
  [0, 3],
  [0, 4],
  [0, 5],
  [0, 6],
];

export function buildArcCurve(
  from: THREE.Vector3,
  to: THREE.Vector3,
  radius: number,
  lift: number,
): THREE.QuadraticBezierCurve3 {
  const mid = from.clone().add(to).normalize();
  const angularSpan = from.angleTo(to) / Math.PI;
  mid.multiplyScalar(radius * (1 + lift + angularSpan * 0.35));

  return new THREE.QuadraticBezierCurve3(from.clone(), mid, to.clone());
}
