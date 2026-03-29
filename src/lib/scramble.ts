import { MOVE_COUNT, MOVE_NAMES, Move, moveFace } from "@/solver/types";

/**
 * Generate a random-move scramble (25 moves, no consecutive same-face moves).
 * Not random-state, but sufficient for practice.
 */
export function generateScramble(length = 25): string {
  const moves: Move[] = [];
  let lastFace = -1;
  let secondLastFace = -1;

  for (let i = 0; i < length; i++) {
    let m: Move;
    do {
      m = Math.floor(Math.random() * MOVE_COUNT);
    } while (
      moveFace(m) === lastFace ||
      (moveFace(m) === secondLastFace && isOppositeFace(moveFace(m), lastFace))
    );
    moves.push(m);
    secondLastFace = lastFace;
    lastFace = moveFace(m);
  }

  return moves.map((m) => MOVE_NAMES[m]).join(" ");
}

function isOppositeFace(a: number, b: number): boolean {
  return (a ^ b) === 1;
}
