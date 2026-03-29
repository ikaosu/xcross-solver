"use client";

import { useState, useCallback } from "react";
import { validateScramble } from "@/lib/notation";

interface ScrambleInputProps {
  value: string;
  onChange: (scramble: string) => void;
  onGenerate: () => void;
  generating: boolean;
}

export default function ScrambleInput({ value, onChange, onGenerate, generating }: ScrambleInputProps) {
  const [error, setError] = useState<string | null>(null);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const val = e.target.value;
      onChange(val);
      if (val.trim()) {
        setError(validateScramble(val));
      } else {
        setError(null);
      }
    },
    [onChange],
  );

  return (
    <div>
      <textarea
        value={value}
        onChange={handleChange}
        placeholder="スクランブルを入力..."
        rows={1}
        className="w-full bg-card border border-card-border px-3 py-2 font-mono text-base md:text-lg
                   focus:outline-none focus:border-foreground resize-none leading-relaxed"
      />
      <div className="flex items-center gap-3 mt-1 text-xs">
        <span
          onClick={onGenerate}
          className="cursor-pointer text-muted hover:text-foreground underline"
        >
          ランダム生成
        </span>
        {error && <span className="text-red-600">{error}</span>}
      </div>
    </div>
  );
}
