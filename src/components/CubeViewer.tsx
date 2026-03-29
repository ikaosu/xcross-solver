"use client";

import { useEffect, useRef } from "react";

type StickeringType = "full" | "Cross" | "F2L" | "xcross";
// xcross = cross + 1 F2L pair (custom stickering)

interface CubeViewerProps {
  scramble: string;
  solution?: string;
  stickering?: StickeringType;
}

export default function CubeViewer({ scramble, solution, stickering }: CubeViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      const { TwistyPlayer } = await import("cubing/twisty");
      if (cancelled || !containerRef.current) return;

      if (playerRef.current) {
        playerRef.current.remove();
      }

      const setupAlg = solution
        ? `${scramble} ${solution}`.trim()
        : scramble || "";

      const stickeringValue = stickering === "xcross" ? "F2L" : (stickering || "full");

      const player = new TwistyPlayer({
        puzzle: "3x3x3",
        visualization: "3D",
        controlPanel: "none",
        background: "none",
        backView: "top-right",
        hintFacelets: "floating",
        experimentalSetupAlg: setupAlg,
        experimentalSetupAnchor: "start",
        experimentalStickering: stickeringValue as any,
        alg: "",
      });

      player.style.width = "100%";
      player.style.height = "100%";

      containerRef.current.appendChild(player);
      playerRef.current = player;
    }

    init();

    return () => {
      cancelled = true;
    };
  }, [scramble, solution, stickering]);

  return (
    <div
      ref={containerRef}
      className="w-full aspect-square max-w-[320px] overflow-hidden bg-card border border-card-border"
    />
  );
}
