import { Slot } from "./types";

// ============================================================
// Piece indexing (Kociemba convention)
// ============================================================

// Edge indices (0..11)
export const UR = 0, UF = 1, UL = 2, UB = 3;
export const DR = 4, DF = 5, DL = 6, DB = 7;
export const FR = 8, FL = 9, BL = 10, BR = 11;

export const NUM_EDGES = 12;

// Corner indices (0..7)
export const URF = 0, UFL = 1, ULB = 2, UBR = 3;
export const DFR = 4, DLF = 5, DBL = 6, DRB = 7;

export const NUM_CORNERS = 8;

// ============================================================
// Cross pieces (D-face cross edges)
// ============================================================
export const CROSS_EDGES = [DR, DF, DL, DB]; // indices 4,5,6,7

// ============================================================
// F2L slot -> pieces mapping
// ============================================================
// Index by slot value (0=FR, 1=FL, 2=BL, 3=BR)
export const SLOT_CORNER: number[] = [DFR, DLF, DBL, DRB];
export const SLOT_EDGE: number[] = [FR, FL, BL, BR];

// ============================================================
// Move definitions
// Each move is defined by its effect on edge/corner permutation and orientation
// ============================================================

// Edge permutation cycles for each face move (CW quarter turn)
// Each cycle is [a, b, c, d] meaning a->b->c->d->a
export const EDGE_PERM_CYCLES: number[][] = [
  /* U */ [UF, UL, UB, UR],
  /* D */ [DF, DR, DB, DL],
  /* R */ [UR, BR, DR, FR],
  /* L */ [UL, FL, DL, BL],
  /* F */ [UF, FR, DF, FL],
  /* B */ [UB, BL, DB, BR],
];

// Corner permutation cycles for each face move (CW quarter turn)
export const CORNER_PERM_CYCLES: number[][] = [
  /* U */ [URF, UFL, ULB, UBR],
  /* D */ [DFR, DRB, DBL, DLF],
  /* R */ [URF, UBR, DRB, DFR],
  /* L */ [UFL, DLF, DBL, ULB],
  /* F */ [URF, DFR, DLF, UFL],
  /* B */ [UBR, ULB, DBL, DRB],
];

// Edge orientation changes for each face move (CW quarter turn)
// 0 = no flip, 1 = flip
// For standard orientation convention:
// - U, D, R, L moves don't flip edges
// - F, B moves flip the 4 edges in their cycle
export const EDGE_ORI_DELTA: number[][] = [
  /* U */ [0, 0, 0, 0],
  /* D */ [0, 0, 0, 0],
  /* R */ [0, 0, 0, 0],
  /* L */ [0, 0, 0, 0],
  /* F */ [1, 1, 1, 1],
  /* B */ [1, 1, 1, 1],
];

// Corner orientation changes for each face move (CW quarter turn)
// delta[i] is the twist applied to the piece moving from cycle[i] to cycle[i+1]
// 0 = no twist, 1 = CW twist, 2 = CCW twist
export const CORNER_ORI_DELTA: number[][] = [
  /* U */ [0, 0, 0, 0],
  /* D */ [0, 0, 0, 0],
  /* R */ [1, 2, 1, 2],
  /* L */ [2, 1, 2, 1],
  /* F */ [2, 1, 2, 1],
  /* B */ [1, 2, 1, 2],
];
