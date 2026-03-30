"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Solution, SolverType, Slot, CrossColor, PairInfo, getFBLOptions } from "@/solver/types";
import { SLOT_CORNER, SLOT_EDGE } from "@/solver/constants";

export type SolverStatus = "uninitialized" | "initializing" | "ready" | "solving";

interface InitProgress {
  phase: string;
  percent: number;
}

export function useSolver() {
  const [status, setStatus] = useState<SolverStatus>("uninitialized");
  const [initProgress, setInitProgress] = useState<InitProgress>({ phase: "", percent: 0 });
  const [solutions, setSolutions] = useState<Solution[]>([]);
  const solverRef = useRef<typeof import("@/solver/solver-sync") | null>(null);

  const init = useCallback(async () => {
    if (status !== "uninitialized") return;
    setStatus("initializing");

    try {
      // Dynamically import the solver module (avoids SSR issues)
      const solver = await import("@/solver/solver-sync");
      solverRef.current = solver;

      // Generate tables
      setInitProgress({ phase: "Generating cross move table...", percent: 10 });
      await delay(0); // yield to UI
      solver.initMoveTables();

      setInitProgress({ phase: "Generating cross pruning table...", percent: 30 });
      await delay(0);
      solver.initCrossPruningTable();

      setInitProgress({ phase: "Generating xcross pruning tables...", percent: 40 });
      await delay(0);

      const slots = [Slot.FR, Slot.FL, Slot.BL, Slot.BR];
      for (let i = 0; i < slots.length; i++) {
        const slot = slots[i];
        setInitProgress({
          phase: `Generating xcross tables (${i + 1}/4)...`,
          percent: 40 + (i / 4) * 35,
        });
        await delay(0);
        solver.initXCrossPruningTables(SLOT_CORNER[slot], SLOT_EDGE[slot]);
      }

      setInitProgress({ phase: "Generating FB move tables...", percent: 80 });
      await delay(0);
      solver.initFBTables();

      setInitProgress({ phase: "Generating FB pruning table...", percent: 85 });
      await delay(0);
      solver.initFBPruningTable();

      setInitProgress({ phase: "Ready!", percent: 100 });
      setStatus("ready");
    } catch (e) {
      console.error("Solver init failed:", e);
      setStatus("uninitialized");
    }
  }, [status]);

  const solve = useCallback(
    (scramble: string, solverType: SolverType, slots: Slot[], maxExtraDepth: number, crossColors: CrossColor[] = [CrossColor.White], pairInfos?: PairInfo[], lColors?: CrossColor[]) => {
      if (!solverRef.current || status !== "ready") return;
      setStatus("solving");
      setSolutions([]);

      setTimeout(() => {
        try {
          const allResults: Solution[] = [];
          if (solverType === SolverType.FB && lColors && lColors.length > 0) {
            for (const dColor of crossColors) {
              const validL = new Set(getFBLOptions(dColor));
              for (const lColor of lColors) {
                if (!validL.has(lColor)) continue;
                const results = solverRef.current!.solve(scramble, solverType, slots, maxExtraDepth, dColor, undefined, lColor);
                allResults.push(...results);
              }
            }
          } else {
            for (const color of crossColors) {
              const results = solverRef.current!.solve(scramble, solverType, slots, maxExtraDepth, color, pairInfos);
              allResults.push(...results);
            }
          }
          setSolutions(allResults);
        } catch (e) {
          console.error("Solve failed:", e);
        }
        setStatus("ready");
      }, 50);
    },
    [status],
  );

  const findPairs = useCallback(
    (scramble: string, crossColors: CrossColor[] = [CrossColor.White]): PairInfo[] => {
      if (!solverRef.current) return [];
      const allPairs: PairInfo[] = [];
      for (const color of crossColors) {
        allPairs.push(...solverRef.current.findPairs(scramble, color));
      }
      return allPairs;
    },
    [],
  );

  // Auto-init on mount
  useEffect(() => {
    init();
  }, [init]);

  return {
    status,
    initProgress,
    solutions,
    solve,
    setSolutions,
    findPairs,
  };
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
