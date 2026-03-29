"use client";

import { useState, useCallback, useMemo } from "react";
import { Solution, Slot, SLOT_NAMES, MOVE_NAMES, CROSS_COLOR_NAMES, CROSS_COLOR_ROTATION, CrossColor } from "@/solver/types";

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
}

export default function SolutionList({ solutions, selectedIndex, onSelect }: SolutionListProps) {
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
        <GroupedBySlotView solutions={solutions} selectedIndex={selectedIndex} onSelect={onSelect} />
      ) : (
        <SortedByLengthView solutions={solutions} selectedIndex={selectedIndex} onSelect={onSelect} />
      )}
    </div>
  );
}

function GroupedBySlotView({ solutions, selectedIndex, onSelect }: SolutionListProps) {
  // Group by slot
  const grouped = new Map<string, { solutions: Solution[]; startIndex: number }>();
  let idx = 0;
  for (const sol of solutions) {
    const key = sol.slot !== undefined ? SLOT_NAMES[sol.slot] : "Cross";
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
                />
              );
            })}
          </div>
        </div>
      ))}
    </>
  );
}

function SortedByLengthView({ solutions, selectedIndex, onSelect }: SolutionListProps) {
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
        const slotLabel = sol.slot !== undefined ? SLOT_NAMES[sol.slot] : "Cross";
        return (
          <SolutionRow
            key={originalIndex}
            sol={sol}
            isSelected={originalIndex === selectedIndex}
            onSelect={() => onSelect(originalIndex)}
            slotLabel={slotLabel}
            isGlobalOptimal={sol.length === globalOptimal}
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
}: {
  sol: Solution;
  isSelected: boolean;
  onSelect: () => void;
  slotLabel?: string;
  isGlobalOptimal?: boolean;
}) {
  const moveStr = sol.moves.map((m) => MOVE_NAMES[m]).join(" ");
  const rotation = sol.crossColor !== undefined ? CROSS_COLOR_ROTATION[sol.crossColor] : "";
  const fullStr = rotation ? `${rotation} ${moveStr}` : moveStr;
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
      {sol.crossColor !== undefined && (
        <span
          className="inline-block w-3 h-3 shrink-0 border border-black/20"
          style={{ backgroundColor: COLOR_CSS[sol.crossColor] }}
          title={CROSS_COLOR_NAMES[sol.crossColor]}
        />
      )}
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
