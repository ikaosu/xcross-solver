"use client";

import { SolverType, Slot, SLOT_NAMES, CrossColor, PairInfo } from "@/solver/types";

interface SolveControlsProps {
  solverType: SolverType;
  onSolverTypeChange: (type: SolverType) => void;
  crossColors: CrossColor[];
  onCrossColorsChange: (colors: CrossColor[]) => void;
  selectedSlots: Slot[];
  onSlotsChange: (slots: Slot[]) => void;
  maxExtraDepth: number;
  onMaxExtraDepthChange: (depth: number) => void;
  onSolve: () => void;
  solving: boolean;
  ready: boolean;
  preservePair: boolean;
  onPreservePairChange: (v: boolean) => void;
  detectedPairs: PairInfo[];
}

const SOLVER_TYPES = [
  { value: SolverType.Cross, label: "Cross" },
  { value: SolverType.XCross, label: "XCross" },
];

const CROSS_COLORS: { value: CrossColor; label: string; cssColor: string }[] = [
  { value: CrossColor.White,  label: "W", cssColor: "#ffffff" },
  { value: CrossColor.Yellow, label: "Y", cssColor: "#ffd500" },
  { value: CrossColor.Green,  label: "G", cssColor: "#00d020" },
  { value: CrossColor.Blue,   label: "B", cssColor: "#0050ff" },
  { value: CrossColor.Red,    label: "R", cssColor: "#e00000" },
  { value: CrossColor.Orange, label: "O", cssColor: "#ff8000" },
];

const ALL_SLOTS = [Slot.FR, Slot.FL, Slot.BL, Slot.BR];
const EXTRA_DEPTHS = [0, 1, 2, 3];

export default function SolveControls({
  solverType,
  onSolverTypeChange,
  crossColors,
  onCrossColorsChange,
  selectedSlots,
  onSlotsChange,
  maxExtraDepth,
  onMaxExtraDepthChange,
  onSolve,
  solving,
  ready,
  preservePair,
  onPreservePairChange,
  detectedPairs,
}: SolveControlsProps) {
  const toggleColor = (color: CrossColor) => {
    if (crossColors.includes(color)) {
      if (crossColors.length > 1) {
        onCrossColorsChange(crossColors.filter((c) => c !== color));
      }
    } else {
      onCrossColorsChange([...crossColors, color]);
    }
  };

  const toggleSlot = (slot: Slot) => {
    if (selectedSlots.includes(slot)) {
      if (selectedSlots.length > 1) {
        onSlotsChange(selectedSlots.filter((s) => s !== slot));
      }
    } else {
      onSlotsChange([...selectedSlots, slot]);
    }
  };

  return (
    <div className="bg-card border border-card-border p-3 space-y-3 text-[13px]">
      <div className="flex flex-wrap gap-x-5 gap-y-2 items-center">
        <div className="flex gap-1">
          {SOLVER_TYPES.map(({ value, label }) => (
            <span
              key={value}
              onClick={() => onSolverTypeChange(value)}
              className={`px-2 py-0.5 cursor-pointer border ${
                solverType === value
                  ? "border-foreground font-bold"
                  : "border-transparent text-muted hover:text-foreground"
              }`}
            >{label}</span>
          ))}
        </div>

        <div className="flex gap-0.5">
          {CROSS_COLORS.map(({ value, label, cssColor }) => {
            const selected = crossColors.includes(value);
            return (
              <span
                key={value}
                onClick={() => toggleColor(value)}
                className="cursor-pointer inline-block w-5 h-5 leading-5 text-center text-[10px] font-bold"
                style={{
                  backgroundColor: selected ? cssColor : undefined,
                  color: selected
                    ? (value === CrossColor.White || value === CrossColor.Yellow ? "#000" : "#fff")
                    : cssColor,
                  outline: selected ? "2px solid #333" : undefined,
                  outlineOffset: "-1px",
                  opacity: selected ? 1 : 0.4,
                }}
              >{label}</span>
            );
          })}
        </div>
      </div>

      {solverType === SolverType.XCross && (
        <div className="flex flex-wrap gap-x-5 gap-y-2 items-center">
          <div className="flex gap-1 font-mono text-xs">
            {ALL_SLOTS.map((slot) => (
              <span
                key={slot}
                onClick={() => toggleSlot(slot)}
                className={`px-1.5 py-0.5 cursor-pointer border ${
                  selectedSlots.includes(slot)
                    ? "border-foreground"
                    : "border-card-border text-muted hover:text-foreground"
                }`}
              >{SLOT_NAMES[slot]}</span>
            ))}
          </div>

          <div className="flex gap-1 text-xs items-center">
            <span className="text-muted">最短</span>
            {EXTRA_DEPTHS.map((d) => (
              <span
                key={d}
                onClick={() => onMaxExtraDepthChange(d)}
                className={`px-1.5 py-0.5 cursor-pointer border ${
                  maxExtraDepth === d
                    ? "border-foreground font-bold"
                    : "border-card-border text-muted hover:text-foreground"
                }`}
              >+{d}</span>
            ))}
          </div>
        </div>
      )}

      {solverType === SolverType.XCross && (
        <div className="text-xs">
          <div className="flex items-center gap-2 mb-1">
            <label
              onClick={() => detectedPairs.length > 0 && onPreservePairChange(!preservePair)}
              className={`flex items-center gap-1.5 cursor-pointer select-none ${
                detectedPairs.length === 0 ? "opacity-30 cursor-default" : ""
              }`}
            >
              <span className={`inline-block w-3.5 h-3.5 border text-center leading-3.5 text-[10px] ${
                preservePair && detectedPairs.length > 0
                  ? "bg-foreground text-background border-foreground"
                  : "border-card-border"
              }`}>{preservePair && detectedPairs.length > 0 ? "\u2713" : ""}</span>
              ペアを活用
            </label>
          </div>
          {detectedPairs.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {detectedPairs.map((p, i) => (
                <span key={i} className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-success/10 text-success border border-success/30 font-mono">
                  {SLOT_NAMES[p.slot]}
                  <span className="text-success/60">+</span>
                  {p.edgeLabel}
                </span>
              ))}
            </div>
          ) : (
            <span className="text-muted">ペアなし</span>
          )}
        </div>
      )}

      <button
        onClick={onSolve}
        disabled={solving || !ready}
        className="w-full py-1.5 border border-foreground font-bold hover:bg-foreground hover:text-background
                   transition-colors disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-foreground"
      >
        {!ready ? "読み込み中..." : solving ? "探索中..." : "探索"}
      </button>
    </div>
  );
}
