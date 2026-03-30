// Face enumeration
export const Face = { U: 0, D: 1, R: 2, L: 3, F: 4, B: 5 } as const;

// 18 HTM moves: each face has 3 variants (CW, CCW, 180)
// Index: face * 3 + variant (0=CW, 1=CCW, 2=180)
export type Move = number; // 0..17

// Move constants
export const MOVE_U = 0, MOVE_U_PRIME = 1, MOVE_U2 = 2;
export const MOVE_D = 3, MOVE_D_PRIME = 4, MOVE_D2 = 5;
export const MOVE_R = 6, MOVE_R_PRIME = 7, MOVE_R2 = 8;
export const MOVE_L = 9, MOVE_L_PRIME = 10, MOVE_L2 = 11;
export const MOVE_F = 12, MOVE_F_PRIME = 13, MOVE_F2 = 14;
export const MOVE_B = 15, MOVE_B_PRIME = 16, MOVE_B2 = 17;

export const MOVE_COUNT = 18;

export const MOVE_NAMES = [
  "U", "U'", "U2",
  "D", "D'", "D2",
  "R", "R'", "R2",
  "L", "L'", "L2",
  "F", "F'", "F2",
  "B", "B'", "B2",
];

// Get the face of a move (0..5)
export function moveFace(m: Move): number {
  return (m / 3) | 0;
}

// F2L slot identifiers
export const Slot = { FR: 0, FL: 1, BL: 2, BR: 3 } as const;
export type Slot = (typeof Slot)[keyof typeof Slot];

export const SLOT_NAMES = ["FR", "FL", "BL", "BR"];

export type SlotPair = [Slot, Slot];

// Solver type
export const SolverType = { Cross: 0, XCross: 1, XXCross: 2, FB: 3 } as const;
export type SolverType = (typeof SolverType)[keyof typeof SolverType];

// Cross color (which face to solve cross on)
export const CrossColor = {
  White: 0,  // D face (default)
  Yellow: 1, // U face
  Green: 2,  // F face
  Blue: 3,   // B face
  Red: 4,    // R face
  Orange: 5, // L face
} as const;
export type CrossColor = (typeof CrossColor)[keyof typeof CrossColor];

export const CROSS_COLOR_NAMES = ["W", "Y", "G", "B", "R", "O"];

// Rotation prefix for each cross color (scramble is White=U, Green=F)
// Physical rotations: x = CW from right (U→B→D→F), z = CW from front (U→R→D→L)
export const CROSS_COLOR_ROTATION: string[] = [
  "x2",  // White: U↔D (self-inverse)
  "",     // Yellow: already D
  "x'",  // Green: F→D (forward tilt)
  "x",   // Blue: B→D (backward tilt)
  "z",   // Red: R→D
  "z'",  // Orange: L→D
];

// Detected pair info
export interface PairInfo {
  slot: Slot;         // F2L slot this pair belongs to
  cornerPiece: number;
  edgePiece: number;  // could be F2L edge OR cross edge
  edgeLabel: string;  // e.g. "FR", "DR"
}

// Solution result
export interface Solution {
  moves: Move[];
  crossColor?: CrossColor;
  dColor?: CrossColor;    // FB: bottom face color
  lColor?: CrossColor;    // FB: left face color
  length: number;
  slot?: Slot;
  slotPair?: SlotPair;
  isOptimal: boolean;
  rotation?: string;      // explicit rotation prefix (overrides crossColor-based)
  goalIdx?: number;       // FB: which L-layer goal was reached (0=home, 1=L, 2=L2, 3=L')
}

// ============================================================
// FB (Roux First Block) helpers
// ============================================================

// CrossColor → standard face position (which face has this color in solved state)
// Face indices: U=0, D=1, R=2, L=3, F=4, B=5
export const COLOR_STANDARD_FACE: number[] = [
  0, // White  → U
  1, // Yellow → D
  4, // Green  → F
  5, // Blue   → B
  2, // Red    → R
  3, // Orange → L
];

// Face position → CrossColor (which color is on this face in solved state)
export const FACE_STANDARD_COLOR: CrossColor[] = [
  0, // U → White
  1, // D → Yellow
  4, // R → Red
  5, // L → Orange
  2, // F → Green
  3, // B → Blue
];

// Opposite cross colors (same axis)
export const OPPOSITE_COLOR: Record<number, CrossColor> = {
  [CrossColor.White]:  CrossColor.Yellow,
  [CrossColor.Yellow]: CrossColor.White,
  [CrossColor.Green]:  CrossColor.Blue,
  [CrossColor.Blue]:   CrossColor.Green,
  [CrossColor.Red]:    CrossColor.Orange,
  [CrossColor.Orange]: CrossColor.Red,
};

/** Get valid L face colors for a given D face color. */
export function getFBLOptions(dColor: CrossColor): CrossColor[] {
  const opposite = OPPOSITE_COLOR[dColor];
  return ([0, 1, 2, 3, 4, 5] as CrossColor[]).filter(c => c !== dColor && c !== opposite);
}

// Solver configuration
export interface SolverConfig {
  scramble: string;
  solverType: SolverType;
  crossColor: CrossColor;
  slots: Slot[];
  slotPairs: SlotPair[];
  maxExtraDepth: number;
}

// Solver statistics
export interface SolveStats {
  totalSolutions: number;
  optimalLength: number;
  timeMs: number;
  nodesExplored: number;
}

// Worker message types
export type WorkerRequest =
  | { type: "init" }
  | { type: "solve"; config: SolverConfig }
  | { type: "cancel" };

export type WorkerResponse =
  | { type: "init-progress"; phase: string; percent: number }
  | { type: "init-complete" }
  | { type: "solution"; solution: Solution }
  | { type: "solve-progress"; slot: string; depth: number }
  | { type: "solve-complete"; stats: SolveStats }
  | { type: "error"; message: string };
