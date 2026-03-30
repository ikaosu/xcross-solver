"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import dynamic from "next/dynamic";
import ScrambleInput from "@/components/ScrambleInput";
import SolveControls from "@/components/SolveControls";
import SolutionList from "@/components/SolutionList";
import InitProgress from "@/components/InitProgress";
import { useSolver } from "@/hooks/useSolver";
import { SolverType, Slot, CrossColor, PairInfo, MOVE_NAMES, CROSS_COLOR_ROTATION, SLOT_NAMES, getFBLOptions } from "@/solver/types";
import { convertToRw, simplifyRotation } from "@/lib/notation";

const CubeViewer = dynamic(() => import("@/components/CubeViewer"), { ssr: false });

export default function Home() {
  const { status, initProgress, solutions, solve, setSolutions, findPairs } = useSolver();

  const [scramble, setScramble] = useState("");
  const [solverType, setSolverType] = useState<SolverType>(SolverType.XCross);
  const [crossColors, setCrossColors] = useState<CrossColor[]>([CrossColor.White]);
  const [selectedSlots, setSelectedSlots] = useState<Slot[]>([Slot.FR, Slot.FL, Slot.BL, Slot.BR]);
  const [maxExtraDepth, setMaxExtraDepth] = useState(2);
  const [selectedSolutionIndex, setSelectedSolutionIndex] = useState<number | null>(null);
  const [preservePair, setPreservePair] = useState(false);
  const [fbLColors, setFBLColors] = useState<CrossColor[]>(() => getFBLOptions(CrossColor.White));
  const [useRw, setUseRw] = useState(false);

  // Detect pairs when scramble or cross colors change
  const detectedPairs = useMemo(() => {
    if (!scramble.trim() || status === "uninitialized" || status === "initializing") return [];
    return findPairs(scramble, crossColors);
  }, [scramble, crossColors, status, findPairs]);

  // Auto-off preserve pair when no pairs detected
  useEffect(() => {
    if (detectedPairs.length === 0) setPreservePair(false);
  }, [detectedPairs]);

  // Update FB L colors when D colors change (remove invalid combinations)
  useEffect(() => {
    const validOptions = new Set<CrossColor>();
    for (const dc of crossColors) {
      for (const lc of getFBLOptions(dc)) validOptions.add(lc);
    }
    setFBLColors(prev => {
      const filtered = prev.filter(c => validOptions.has(c));
      return filtered.length > 0 ? filtered : Array.from(validOptions);
    });
  }, [crossColors]);

  const handleGenerate = useCallback(() => {
    const { generateScramble } = require("@/lib/scramble");
    setScramble(generateScramble());
    setSolutions([]);
    setSelectedSolutionIndex(null);
  }, [setSolutions]);

  const handleSolve = useCallback(() => {
    if (!scramble.trim()) return;
    setSelectedSolutionIndex(null);
    if (solverType === SolverType.FB) {
      solve(scramble, solverType, [], maxExtraDepth, crossColors, undefined, fbLColors);
    } else {
      const pairsToUse = preservePair && detectedPairs.length > 0 ? detectedPairs : undefined;
      const slotsToSolve = pairsToUse
        ? [...new Set(pairsToUse.map((p) => p.slot))]
        : selectedSlots;
      solve(scramble, solverType, slotsToSolve, maxExtraDepth, crossColors, pairsToUse);
    }
  }, [scramble, solverType, selectedSlots, maxExtraDepth, crossColors, solve, preservePair, detectedPairs, fbLColors]);

  const selectedSolution = selectedSolutionIndex !== null ? solutions[selectedSolutionIndex] : null;
  const solutionAlg = (() => {
    if (!selectedSolution) return "";
    const baseRot = selectedSolution.rotation ?? (selectedSolution.crossColor !== undefined ? CROSS_COLOR_ROTATION[selectedSolution.crossColor] : "");
    if (useRw && selectedSolution.dColor !== undefined) {
      const { moves: rwMoves, rotationSuffix } = convertToRw(selectedSolution.moves);
      const rot = simplifyRotation((baseRot + rotationSuffix).trim());
      return [rot, rwMoves].filter(Boolean).join(" ");
    }
    return [baseRot, selectedSolution.moves.map((m) => MOVE_NAMES[m]).join(" ")].filter(Boolean).join(" ");
  })();

  return (
    <main className="flex-1 p-2 md:p-4 max-w-5xl mx-auto w-full">
      {status === "initializing" && (
        <InitProgress phase={initProgress.phase} percent={initProgress.percent} />
      )}

      <div className="flex items-center justify-between mb-2">
        <div className="font-mono font-bold text-sm">xcross / fb solver</div>
      </div>

      <ScrambleInput
        value={scramble}
        onChange={setScramble}
        onGenerate={handleGenerate}
        generating={false}
      />

      <div className="grid grid-cols-1 md:grid-cols-[340px_1fr] gap-4 mt-3">
        <div>
          <CubeViewer scramble={scramble} solution={solutionAlg} />
        </div>

        <div className="space-y-3">
          <SolveControls
            solverType={solverType}
            onSolverTypeChange={setSolverType}
            crossColors={crossColors}
            onCrossColorsChange={setCrossColors}
            selectedSlots={selectedSlots}
            onSlotsChange={setSelectedSlots}
            maxExtraDepth={maxExtraDepth}
            onMaxExtraDepthChange={setMaxExtraDepth}
            onSolve={handleSolve}
            solving={status === "solving"}
            ready={status === "ready" || status === "solving"}
            preservePair={preservePair}
            onPreservePairChange={setPreservePair}
            detectedPairs={detectedPairs}
            fbLColors={fbLColors}
            onFBLColorsChange={setFBLColors}
            useRw={useRw}
            onUseRwChange={setUseRw}
          />
          <SolutionList
            solutions={solutions}
            selectedIndex={selectedSolutionIndex}
            onSelect={setSelectedSolutionIndex}
            useRw={useRw}
          />
        </div>
      </div>
    </main>
  );
}
