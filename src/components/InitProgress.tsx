"use client";

interface InitProgressProps {
  phase: string;
  percent: number;
}

export default function InitProgress({ phase, percent }: InitProgressProps) {
  return (
    <div className="fixed inset-0 bg-background/90 flex items-center justify-center z-50">
      <div className="bg-card border border-card-border rounded-xl p-8 max-w-sm w-full mx-4 space-y-4">
        <h2 className="text-lg font-bold text-center">ソルバー初期化中</h2>
        <p className="text-sm text-muted text-center">{phase}</p>
        <div className="w-full bg-card-border rounded-full h-2">
          <div
            className="bg-accent h-2 rounded-full transition-all duration-300"
            style={{ width: `${Math.min(100, percent)}%` }}
          />
        </div>
        <p className="text-xs text-muted text-center">{Math.round(percent)}%</p>
      </div>
    </div>
  );
}
