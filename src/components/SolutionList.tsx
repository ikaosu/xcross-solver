"use client";

import { useState, useCallback, useMemo } from "react";
import { Solution, Slot, SLOT_NAMES, MOVE_NAMES, CROSS_COLOR_NAMES, CROSS_COLOR_ROTATION, CrossColor, SolverType } from "@/solver/types";
import { convertToRw, simplifyRotation } from "@/lib/notation";

const COLOR_CSS: Record<number, string> = {
  [CrossColor.White]:  "#ffffff",
  [CrossColor.Yellow]: "#ffd500",
  [CrossColor.Green]:  "#00d020",
  [CrossColor.Blue]:   "#0050ff",
  [CrossColor.Red]:    "#e00000",
  [CrossColor.Orange]: "#ff8000",
};

type ViewMode = "bySlot" | "byLength";

interface SolutionListProps {
  solutions: Solution[];
  selectedIndex: number | null;
  onSelect: (index: number) => void;
  useRw?: boolean;
}

export default function SolutionList({ solutions, selectedIndex, onSelect, useRw }: SolutionListProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("byLength");

  if (solutions.length === 0) {
    return <div className="text-muted text-sm py-6">スクランブルを入力して探索してください</div>;
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-1 text-xs">
        <span className="text-muted">{solutions.length}件</span>
        <span
          onClick={() => setViewMode("bySlot")}
          className={`cursor-pointer ${viewMode === "bySlot" ? "font-bold" : "text-muted hover:text-foreground"}`}
        >スロット別</span>
        <span
          onClick={() => setViewMode("byLength")}
          className={`cursor-pointer ${viewMode === "byLength" ? "font-bold" : "text-muted hover:text-foreground"}`}
        >手数順</span>
      </div>

      {viewMode === "bySlot" ? (
        <GroupedBySlotView solutions={solutions} selectedIndex={selectedIndex} onSelect={onSelect} useRw={useRw} />
      ) : (
        <SortedByLengthView solutions={solutions} selectedIndex={selectedIndex} onSelect={onSelect} useRw={useRw} />
      )}
    </div>
  );
}

function GroupedBySlotView({ solutions, selectedIndex, onSelect, useRw }: SolutionListProps) {
  // Group by slot (xcross) or D+L color (FB)
  const grouped = new Map<string, { solutions: Solution[]; startIndex: number }>();
  let idx = 0;
  for (const sol of solutions) {
    let key: string;
    if (sol.dColor !== undefined && sol.lColor !== undefined) {
      key = `D:${CROSS_COLOR_NAMES[sol.dColor]} L:${CROSS_COLOR_NAMES[sol.lColor]}`;
    } else if (sol.slot !== undefined) {
      key = SLOT_NAMES[sol.slot];
    } else {
      key = "Cross";
    }
    if (!grouped.has(key)) {
      grouped.set(key, { solutions: [], startIndex: idx });
    }
    grouped.get(key)!.solutions.push(sol);
    idx++;
  }

  return (
    <>
      {Array.from(grouped.entries()).map(([slotName, group]) => (
        <div key={slotName} className="mb-2">
          <div className="font-bold text-xs border-b border-card-border pb-0.5 mb-0.5">
            {slotName} <span className="font-normal text-muted">({group.solutions.length}件, 最短{group.solutions[0]?.length}手)</span>
          </div>
          <div className="max-h-64 overflow-y-auto">
            {group.solutions.map((sol, i) => {
              const globalIdx = group.startIndex + i;
              return (
                <SolutionRow
                  key={globalIdx}
                  sol={sol}
                  isSelected={globalIdx === selectedIndex}
                  onSelect={() => onSelect(globalIdx)}
                  useRw={useRw}
                />
              );
            })}
          </div>
        </div>
      ))}
    </>
  );
}

function SortedByLengthView({ solutions, selectedIndex, onSelect, useRw }: SolutionListProps) {
  // Build index-preserving sorted list
  const sorted = useMemo(() => {
    const indexed = solutions.map((sol, i) => ({ sol, originalIndex: i }));
    indexed.sort((a, b) => a.sol.length - b.sol.length);
    return indexed;
  }, [solutions]);

  const globalOptimal = sorted.length > 0 ? sorted[0].sol.length : 0;

  return (
    <div className="space-y-1 max-h-[500px] overflow-y-auto">
      {sorted.map(({ sol, originalIndex }) => {
        let slotLabel: string;
        if (sol.dColor !== undefined) {
          slotLabel = "FB";
        } else if (sol.slot !== undefined) {
          slotLabel = SLOT_NAMES[sol.slot];
        } else {
          slotLabel = "Cross";
        }
        return (
          <SolutionRow
            key={originalIndex}
            sol={sol}
            isSelected={originalIndex === selectedIndex}
            onSelect={() => onSelect(originalIndex)}
            slotLabel={slotLabel}
            isGlobalOptimal={sol.length === globalOptimal}
            useRw={useRw}
          />
        );
      })}
    </div>
  );
}

function SolutionRow({
  sol,
  isSelected,
  onSelect,
  slotLabel,
  isGlobalOptimal,
  useRw,
}: {
  sol: Solution;
  isSelected: boolean;
  onSelect: () => void;
  slotLabel?: string;
  isGlobalOptimal?: boolean;
  useRw?: boolean;
}) {
  const baseRotation = sol.rotation ?? (sol.crossColor !== undefined ? CROSS_COLOR_ROTATION[sol.crossColor] : "");
  let moveStr: string;
  let rotation: string;
  if (useRw && sol.dColor !== undefined) {
    const { moves: rwMoves, rotationSuffix } = convertToRw(sol.moves);
    moveStr = rwMoves;
    rotation = simplifyRotation((baseRotation + rotationSuffix).trim());
  } else {
    moveStr = sol.moves.map((m) => MOVE_NAMES[m]).join(" ");
    rotation = baseRotation;
  }
  const fullStr = rotation ? `${rotation} ${moveStr}` : moveStr;
  const isFB = sol.dColor !== undefined;
  return (
    <div
      onClick={onSelect}
      className={`flex items-center gap-1.5 px-1.5 py-1 font-mono text-[13px] cursor-pointer border-l-2 ${
        isSelected ? "border-l-foreground bg-foreground/5" : "border-l-transparent hover:bg-foreground/[0.03]"
      }`}
    >
      <span className={`w-4 text-right shrink-0 text-xs ${sol.isOptimal || isGlobalOptimal ? "text-success font-bold" : "text-muted"}`}>
        {sol.length}
      </span>
      {isFB ? (
        <span className="flex gap-px shrink-0" title={`D:${CROSS_COLOR_NAMES[sol.dColor!]} L:${CROSS_COLOR_NAMES[sol.lColor!]}`}>
          <span className="inline-block w-3 h-3 border border-black/20" style={{ backgroundColor: COLOR_CSS[sol.dColor!] }} />
          <span className="inline-block w-3 h-3 border border-black/20" style={{ backgroundColor: COLOR_CSS[sol.lColor!] }} />
        </span>
      ) : sol.crossColor !== undefined ? (
        <span
          className="inline-block w-3 h-3 shrink-0 border border-black/20"
          style={{ backgroundColor: COLOR_CSS[sol.crossColor] }}
          title={CROSS_COLOR_NAMES[sol.crossColor]}
        />
      ) : null}
      {slotLabel && (
        <span className="text-muted text-xs shrink-0">{slotLabel}</span>
      )}
      <span className="truncate flex-1">
        {rotation && <span className="text-muted">{rotation} </span>}
        {moveStr || "(solved)"}
      </span>
      <CopyButton text={fullStr} />
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      navigator.clipboard.writeText(text).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      });
    },
    [text],
  );

  return (
    <span
      onClick={handleCopy}
      className="shrink-0 text-xs text-muted cursor-pointer hover:text-foreground"
    >
      {copied ? "\u2713" : "copy"}
    </span>
  );
}
