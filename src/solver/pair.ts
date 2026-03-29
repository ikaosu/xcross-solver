import { CubeState } from "./cube-state";
import { Slot, PairInfo, CrossColor } from "./types";
import { NUM_EDGES, NUM_CORNERS } from "./constants";

// ============================================================
// Face membership tables
// ============================================================

// Faces: U=0 D=1 R=2 L=3 F=4 B=5

/** CORNER_ON_FACE[slot][face] */
export const CORNER_ON_FACE: boolean[][] = [
  /* URF(0) */ [true, false, true, false, true, false],
  /* UFL(1) */ [true, false, false, true, true, false],
  /* ULB(2) */ [true, false, false, true, false, true],
  /* UBR(3) */ [true, false, true, false, false, true],
  /* DFR(4) */ [false, true, true, false, true, false],
  /* DLF(5) */ [false, true, false, true, true, false],
  /* DBL(6) */ [false, true, false, true, false, true],
  /* DRB(7) */ [false, true, true, false, false, true],
];

/** EDGE_ON_FACE[slot][face] */
export const EDGE_ON_FACE: boolean[][] = [
  /* UR(0)  */ [true, false, true, false, false, false],
  /* UF(1)  */ [true, false, false, false, true, false],
  /* UL(2)  */ [true, false, false, true, false, false],
  /* UB(3)  */ [true, false, false, false, false, true],
  /* DR(4)  */ [false, true, true, false, false, false],
  /* DF(5)  */ [false, true, false, false, true, false],
  /* DL(6)  */ [false, true, false, true, false, false],
  /* DB(7)  */ [false, true, false, false, false, true],
  /* FR(8)  */ [false, false, true, false, true, false],
  /* FL(9)  */ [false, false, false, true, true, false],
  /* BL(10) */ [false, false, false, true, false, true],
  /* BR(11) */ [false, false, true, false, false, true],
];

const EDGE_NAMES = ["UR", "UF", "UL", "UB", "DR", "DF", "DL", "DB", "FR", "FL", "BL", "BR"];

/** CORNER_ADJACENT_EDGES[cornerSlot] = [edge1, edge2, edge3] */
const CORNER_ADJACENT_EDGES: number[][] = [
  /* URF(0) */ [0, 1, 8],   // UR, UF, FR
  /* UFL(1) */ [1, 2, 9],   // UF, UL, FL
  /* ULB(2) */ [2, 3, 10],  // UL, UB, BL
  /* UBR(3) */ [3, 0, 11],  // UB, UR, BR
  /* DFR(4) */ [4, 5, 8],   // DR, DF, FR
  /* DLF(5) */ [5, 6, 9],   // DF, DL, FL
  /* DBL(6) */ [6, 7, 10],  // DL, DB, BL
  /* DRB(7) */ [7, 4, 11],  // DB, DR, BR
];

// ============================================================
// Per-cross-color F2L piece definitions
// In ORIGINAL scramble orientation (White=U, Green=F)
// ============================================================

// Each entry: [cornerPieces[4], partnerEdges[4][3]]
// partnerEdges[i] = [f2lEdge, crossEdge1, crossEdge2] for cornerPieces[i]

interface CrossColorDef {
  corners: number[];
  partnerEdges: number[][];
}

// White cross (White=U face): F2L corners are U-layer corners
// When holding white on bottom, FR slot = URF corner, etc.
const WHITE_CROSS: CrossColorDef = {
  corners: [0, 1, 2, 3], // URF, UFL, ULB, UBR
  partnerEdges: [
    [8, 0, 1],   // URF: FR, UR, UF
    [9, 1, 2],   // UFL: FL, UF, UL
    [10, 2, 3],  // ULB: BL, UL, UB
    [11, 3, 0],  // UBR: BR, UB, UR
  ],
};

// Yellow cross (Yellow=D face): F2L corners are D-layer corners
const YELLOW_CROSS: CrossColorDef = {
  corners: [4, 5, 6, 7], // DFR, DLF, DBL, DRB
  partnerEdges: [
    [8, 4, 5],   // DFR: FR, DR, DF
    [9, 5, 6],   // DLF: FL, DF, DL
    [10, 6, 7],  // DBL: BL, DL, DB
    [11, 7, 4],  // DRB: BR, DB, DR
  ],
};

// Green cross (Green=F face): F2L corners are F-layer corners
const GREEN_CROSS: CrossColorDef = {
  corners: [0, 1, 5, 4], // URF, UFL, DLF, DFR
  partnerEdges: [
    [0, 1, 8],   // URF: UR, UF, FR
    [2, 1, 9],   // UFL: UL, UF, FL
    [6, 5, 9],   // DLF: DL, DF, FL
    [4, 5, 8],   // DFR: DR, DF, FR
  ],
};

// Blue cross (Blue=B face)
const BLUE_CROSS: CrossColorDef = {
  corners: [3, 2, 6, 7], // UBR, ULB, DBL, DRB
  partnerEdges: [
    [0, 3, 11],  // UBR: UR, UB, BR
    [2, 3, 10],  // ULB: UL, UB, BL
    [6, 7, 10],  // DBL: DL, DB, BL
    [4, 7, 11],  // DRB: DR, DB, BR
  ],
};

// Red cross (Red=R face)
const RED_CROSS: CrossColorDef = {
  corners: [0, 3, 7, 4], // URF, UBR, DRB, DFR
  partnerEdges: [
    [1, 0, 8],   // URF: UF, UR, FR
    [3, 0, 11],  // UBR: UB, UR, BR
    [7, 4, 11],  // DRB: DB, DR, BR
    [5, 4, 8],   // DFR: DF, DR, FR
  ],
};

// Orange cross (Orange=L face)
const ORANGE_CROSS: CrossColorDef = {
  corners: [1, 2, 6, 5], // UFL, ULB, DBL, DLF
  partnerEdges: [
    [1, 2, 9],   // UFL: UF, UL, FL
    [3, 2, 10],  // ULB: UB, UL, BL
    [7, 6, 10],  // DBL: DB, DL, BL
    [5, 6, 9],   // DLF: DF, DL, FL
  ],
};

function getCrossColorDef(color: CrossColor): CrossColorDef {
  switch (color) {
    case CrossColor.White:  return WHITE_CROSS;
    case CrossColor.Yellow: return YELLOW_CROSS;
    case CrossColor.Green:  return GREEN_CROSS;
    case CrossColor.Blue:   return BLUE_CROSS;
    case CrossColor.Red:    return RED_CROSS;
    case CrossColor.Orange: return ORANGE_CROSS;
    default: return YELLOW_CROSS;
  }
}

// Slot names for each position in the cross color def
// Index 0-3 maps to FR, FL, BL, BR (in the solving orientation)
const SLOT_ORDER: Slot[] = [Slot.FR, Slot.FL, Slot.BL, Slot.BR];

// ============================================================
// Pair detection and utility
// ============================================================

export function areSlotsAdjacent(cornerSlot: number, edgeSlot: number): boolean {
  return CORNER_ADJACENT_EDGES[cornerSlot].includes(edgeSlot);
}

export function isPairSafeMove(face: number, cornerSlot: number, edgeSlot: number): boolean {
  return CORNER_ON_FACE[cornerSlot][face] === EDGE_ON_FACE[edgeSlot][face];
}


// Sticker colors per corner piece: [ref(U/D), CW, CCW]
// Colors: U=0 D=1 R=2 L=3 F=4 B=5
const CORNER_COLORS: number[][] = [
  [0, 2, 4], // URF: white, red, green
  [0, 4, 3], // UFL: white, green, orange
  [0, 3, 5], // ULB: white, orange, blue
  [0, 5, 2], // UBR: white, blue, red
  [1, 4, 2], // DFR: yellow, green, red
  [1, 3, 4], // DLF: yellow, orange, green
  [1, 5, 3], // DBL: yellow, blue, orange
  [1, 2, 5], // DRB: yellow, red, blue
];

// Face order per corner slot: [ref face, CW face, CCW face]
const CORNER_FACE_ORDER: number[][] = [
  [0, 2, 4], [0, 4, 3], [0, 3, 5], [0, 5, 2],
  [1, 4, 2], [1, 3, 4], [1, 5, 3], [1, 2, 5],
];

// Sticker colors per edge piece: [sticker0, sticker1]
const EDGE_COLORS: number[][] = [
  [0, 2], [0, 4], [0, 3], [0, 5], // UR, UF, UL, UB
  [1, 2], [1, 4], [1, 3], [1, 5], // DR, DF, DL, DB
  [4, 2], [4, 3], [5, 3], [5, 2], // FR, FL, BL, BR
];

// Face order per edge slot: [face0, face1]
const EDGE_FACE_ORDER: number[][] = [
  [0, 2], [0, 4], [0, 3], [0, 5],
  [1, 2], [1, 4], [1, 3], [1, 5],
  [4, 2], [4, 3], [5, 3], [5, 2],
];

/**
 * Get the sticker color on a specific face for a corner piece at a given slot/orientation.
 */
function cornerStickerOnFace(piece: number, slot: number, co: number, face: number): number {
  for (let i = 0; i < 3; i++) {
    if (CORNER_FACE_ORDER[slot][i] === face) {
      return CORNER_COLORS[piece][(i - co + 3) % 3];
    }
  }
  return -1;
}

/**
 * Get the sticker color on a specific face for an edge piece at a given slot/orientation.
 */
function edgeStickerOnFace(piece: number, slot: number, eo: number, face: number): number {
  for (let i = 0; i < 2; i++) {
    if (EDGE_FACE_ORDER[slot][i] === face) {
      return EDGE_COLORS[piece][(i + eo) % 2];
    }
  }
  return -1;
}

/**
 * Check if a corner and edge form a valid F2L pair by verifying
 * actual sticker color alignment on shared faces.
 */
function isValidPair(
  cornerPiece: number, cornerSlot: number, cornerOri: number,
  edgePiece: number, edgeSlot: number, edgeOri: number,
): boolean {
  if (!areSlotsAdjacent(cornerSlot, edgeSlot)) return false;

  // On each shared face, the corner and edge stickers must match
  let sharedCount = 0;
  for (let f = 0; f < 6; f++) {
    if (CORNER_ON_FACE[cornerSlot][f] && EDGE_ON_FACE[edgeSlot][f]) {
      const cColor = cornerStickerOnFace(cornerPiece, cornerSlot, cornerOri, f);
      const eColor = edgeStickerOnFace(edgePiece, edgeSlot, edgeOri, f);
      if (cColor !== eColor) return false;
      sharedCount++;
    }
  }

  return sharedCount > 0;
}

/**
 * Detect F2L pairs in the PHYSICAL scrambled state for a given cross color.
 * No move remapping - uses the actual piece positions.
 */
export function detectPairs(state: CubeState, crossColor: CrossColor = CrossColor.Yellow): PairInfo[] {
  const def = getCrossColorDef(crossColor);
  const pairs: PairInfo[] = [];

  for (let i = 0; i < 4; i++) {
    const cornerPiece = def.corners[i];
    const slot = SLOT_ORDER[i];

    // Find corner's current position
    let cornerSlot = -1, cornerOri = 0;
    for (let s = 0; s < NUM_CORNERS; s++) {
      if (state.cp[s] === cornerPiece) { cornerSlot = s; cornerOri = state.co[s]; break; }
    }

    // Check all 3 partner edges
    for (const edgePiece of def.partnerEdges[i]) {
      let edgeSlot = -1, edgeOri = 0;
      for (let s = 0; s < NUM_EDGES; s++) {
        if (state.ep[s] === edgePiece) { edgeSlot = s; edgeOri = state.eo[s]; break; }
      }

      if (cornerSlot >= 0 && edgeSlot >= 0 &&
          isValidPair(cornerPiece, cornerSlot, cornerOri, edgePiece, edgeSlot, edgeOri)) {
        pairs.push({ slot, cornerPiece, edgePiece, edgeLabel: EDGE_NAMES[edgePiece] });
      }
    }
  }

  return pairs;
}
