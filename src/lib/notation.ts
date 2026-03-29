import {
  Move,
  MOVE_U, MOVE_U_PRIME, MOVE_U2,
  MOVE_D, MOVE_D_PRIME, MOVE_D2,
  MOVE_R, MOVE_R_PRIME, MOVE_R2,
  MOVE_L, MOVE_L_PRIME, MOVE_L2,
  MOVE_F, MOVE_F_PRIME, MOVE_F2,
  MOVE_B, MOVE_B_PRIME, MOVE_B2,
  MOVE_NAMES,
} from "../solver/types";

const NOTATION_MAP: Record<string, Move> = {
  U: MOVE_U, "U'": MOVE_U_PRIME, U2: MOVE_U2,
  D: MOVE_D, "D'": MOVE_D_PRIME, D2: MOVE_D2,
  R: MOVE_R, "R'": MOVE_R_PRIME, R2: MOVE_R2,
  L: MOVE_L, "L'": MOVE_L_PRIME, L2: MOVE_L2,
  F: MOVE_F, "F'": MOVE_F_PRIME, F2: MOVE_F2,
  B: MOVE_B, "B'": MOVE_B_PRIME, B2: MOVE_B2,
};

/**
 * Parse a scramble string into an array of Move indices.
 * Supports standard WCA notation: U, U', U2, R, R', R2, etc.
 */
export function parseScramble(scramble: string): Move[] {
  const tokens = scramble.trim().split(/\s+/).filter(Boolean);
  const moves: Move[] = [];

  for (const token of tokens) {
    // Normalize: replace unicode prime with ASCII
    const normalized = token.replace(/[\u2019\u2018\u0060\u00B4]/g, "'");
    const move = NOTATION_MAP[normalized];
    if (move === undefined) {
      throw new Error(`Invalid move notation: "${token}"`);
    }
    moves.push(move);
  }

  return moves;
}

/**
 * Format an array of Move indices back to standard notation.
 */
export function formatMoves(moves: Move[]): string {
  return moves.map((m) => MOVE_NAMES[m]).join(" ");
}

/**
 * Validate a scramble string. Returns null if valid, error message if invalid.
 */
export function validateScramble(scramble: string): string | null {
  if (!scramble.trim()) return "Scramble is empty";
  try {
    parseScramble(scramble);
    return null;
  } catch (e) {
    return (e as Error).message;
  }
}
