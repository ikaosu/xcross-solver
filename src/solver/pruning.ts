import {
  CROSS_COORD_SIZE,
  CROSS_CORNER_COORD_SIZE,
  CROSS_EDGE_COORD_SIZE,
  CORNER_COORD_SIZE,
  EDGE_COORD_SIZE,
} from "./cube-state";
import { MOVE_COUNT } from "./types";
import {
  generateCrossMoveTable,
  generateCornerMoveTable,
  generateEdgeMoveTable,
} from "./moves";

const UNVISITED = 0xff;

// ============================================================
// Cross pruning table
// ============================================================

let crossPruningTable: Uint8Array | null = null;

export function generateCrossPruningTable(
  onProgress?: (percent: number) => void
): Uint8Array {
  if (crossPruningTable) return crossPruningTable;

  const crossMove = generateCrossMoveTable();
  const size = CROSS_COORD_SIZE;
  const table = new Uint8Array(size);
  table.fill(UNVISITED);

  const solvedCoord = computeSolvedCrossCoord();
  table[solvedCoord] = 0;
  let frontier = [solvedCoord];
  let depth = 0;
  let filled = 1;

  while (frontier.length > 0 && depth < 20) {
    const nextFrontier: number[] = [];
    for (const coord of frontier) {
      for (let m = 0; m < MOVE_COUNT; m++) {
        const newCoord = crossMove[coord * MOVE_COUNT + m];
        if (newCoord >= 0 && table[newCoord] === UNVISITED) {
          table[newCoord] = depth + 1;
          nextFrontier.push(newCoord);
          filled++;
        }
      }
    }
    depth++;
    frontier = nextFrontier;
    onProgress?.(Math.min(100, (filled / size) * 100));
  }

  crossPruningTable = table;
  return table;
}

function computeSolvedCrossPermCoord(): number {
  const positions = [4, 5, 6, 7];
  const used = new Uint8Array(12);
  let coord = 0;
  for (let i = 0; i < 4; i++) {
    let rank = 0;
    for (let j = 0; j < positions[i]; j++) {
      if (!used[j]) rank++;
    }
    coord = coord * (12 - i) + rank;
    used[positions[i]] = 1;
  }
  return coord;
}

function computeSolvedCrossCoord(): number {
  return computeSolvedCrossPermCoord() * 16;
}

// ============================================================
// Cross + Corner pruning tables (per corner piece)
// ============================================================

const crossCornerTables = new Map<number, Uint8Array>();

export function generateCrossCornerPruningTable(
  cornerPiece: number,
  onProgress?: (percent: number) => void
): Uint8Array {
  const cached = crossCornerTables.get(cornerPiece);
  if (cached) return cached;

  const crossMove = generateCrossMoveTable();
  const cornerMove = generateCornerMoveTable();
  const size = CROSS_CORNER_COORD_SIZE;
  const table = new Uint8Array(size);
  table.fill(UNVISITED);

  const solvedCrossCoord = computeSolvedCrossCoord();
  const solvedCornerCoord = cornerPiece * 3; // home slot, orientation 0
  const solvedCoord = solvedCrossCoord * CORNER_COORD_SIZE + solvedCornerCoord;

  table[solvedCoord] = 0;
  let frontier = [solvedCoord];
  let depth = 0;
  let filled = 1;

  while (frontier.length > 0 && depth < 20) {
    const nextFrontier: number[] = [];
    for (const coord of frontier) {
      const crossCoord = (coord / CORNER_COORD_SIZE) | 0;
      const cornerCoord = coord % CORNER_COORD_SIZE;

      for (let m = 0; m < MOVE_COUNT; m++) {
        const newCross = crossMove[crossCoord * MOVE_COUNT + m];
        const newCorner = cornerMove[cornerCoord * MOVE_COUNT + m];
        if (newCross < 0) continue;
        const newCoord = newCross * CORNER_COORD_SIZE + newCorner;

        if (table[newCoord] === UNVISITED) {
          table[newCoord] = depth + 1;
          nextFrontier.push(newCoord);
          filled++;
        }
      }
    }
    depth++;
    frontier = nextFrontier;
    onProgress?.(Math.min(100, (filled / size) * 100));
  }

  crossCornerTables.set(cornerPiece, table);
  return table;
}

// ============================================================
// Cross + Edge pruning tables (per edge piece)
// ============================================================

const crossEdgeTables = new Map<number, Uint8Array>();

export function generateCrossEdgePruningTable(
  edgePiece: number,
  onProgress?: (percent: number) => void
): Uint8Array {
  const cached = crossEdgeTables.get(edgePiece);
  if (cached) return cached;

  const crossMove = generateCrossMoveTable();
  const edgeMove = generateEdgeMoveTable();
  const size = CROSS_EDGE_COORD_SIZE;
  const table = new Uint8Array(size);
  table.fill(UNVISITED);

  const solvedCrossCoord = computeSolvedCrossCoord();
  const solvedEdgeCoord = edgePiece * 2; // home slot, orientation 0
  const solvedCoord = solvedCrossCoord * EDGE_COORD_SIZE + solvedEdgeCoord;

  table[solvedCoord] = 0;
  let frontier = [solvedCoord];
  let depth = 0;
  let filled = 1;

  while (frontier.length > 0 && depth < 20) {
    const nextFrontier: number[] = [];
    for (const coord of frontier) {
      const crossCoord = (coord / EDGE_COORD_SIZE) | 0;
      const edgeCoord = coord % EDGE_COORD_SIZE;

      for (let m = 0; m < MOVE_COUNT; m++) {
        const newCross = crossMove[crossCoord * MOVE_COUNT + m];
        const newEdge = edgeMove[edgeCoord * MOVE_COUNT + m];
        if (newCross < 0) continue;
        const newCoord = newCross * EDGE_COORD_SIZE + newEdge;

        if (table[newCoord] === UNVISITED) {
          table[newCoord] = depth + 1;
          nextFrontier.push(newCoord);
          filled++;
        }
      }
    }
    depth++;
    frontier = nextFrontier;
    onProgress?.(Math.min(100, (filled / size) * 100));
  }

  crossEdgeTables.set(edgePiece, table);
  return table;
}

// ============================================================
// Public interface
// ============================================================

export function getCrossPruningTable(): Uint8Array {
  if (!crossPruningTable) throw new Error("Cross pruning table not initialized");
  return crossPruningTable;
}

export function getCrossCornerPruningTable(cornerPiece: number): Uint8Array {
  const table = crossCornerTables.get(cornerPiece);
  if (!table) throw new Error(`Cross+Corner pruning table not initialized for corner ${cornerPiece}`);
  return table;
}

export function getCrossEdgePruningTable(edgePiece: number): Uint8Array {
  const table = crossEdgeTables.get(edgePiece);
  if (!table) throw new Error(`Cross+Edge pruning table not initialized for edge ${edgePiece}`);
  return table;
}

export function resetPruningTables(): void {
  crossPruningTable = null;
  crossCornerTables.clear();
  crossEdgeTables.clear();
}
