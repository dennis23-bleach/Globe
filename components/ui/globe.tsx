"use client";

import createGlobe, { COBEOptions, Marker as CobeMarker } from "cobe";
import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface Marker extends CobeMarker {
  label?: string;
}

const GLOBE_CONFIG: Omit<COBEOptions, 'markers'> & { markers: Marker[] } = {
  width: 800,
  height: 800,
  onRender: () => {},
  devicePixelRatio: 2,
  phi: 0,
  theta: 0.3,
  dark: 0,
  diffuse: 0.4,
  mapSamples: 16000,
  mapBrightness: 1.2,
  baseColor: [1, 1, 1],
  markerColor: [251 / 255, 100 / 255, 21 / 255],
  glowColor: [1, 1, 1],
  markers: [
    { location: [14.5995, 120.9842], size: 0.03, label: "Manila" },
    { location: [19.076, 72.8777], size: 0.1, label: "Mumbai" },
    { location: [23.8103, 90.4125], size: 0.05, label: "Dhaka" },
    { location: [30.0444, 31.2357], size: 0.07, label: "Cairo" },
    { location: [39.9042, 116.4074], size: 0.08, label: "Beijing" },
    { location: [-23.5505, -46.6333], size: 0.1, label: "São Paulo" },
    { location: [19.4326, -99.1332], size: 0.1, label: "Mexico City" },
    { location: [40.7128, -74.006], size: 0.1, label: "New York" },
    { location: [34.6937, 135.5022], size: 0.05, label: "Osaka" },
    { location: [41.0082, 28.9784], size: 0.06, label: "Istanbul" },
  ],
};

export function Globe({
  className,
  config = GLOBE_CONFIG,
}: {
  className?: string;
  config?: Omit<COBEOptions, 'markers'> & { markers: Marker[] };
}) {
  const [hoveredMarker, setHoveredMarker] = useState<Marker | null>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const phi = useRef(0);
  const width = useRef(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pointerInteracting = useRef<number | null>(null);
  const pointerInteractionMovement = useRef<number>(0);
  const r = useRef(0);

  const updatePointerInteraction = (value: number | null) => {
    pointerInteracting.current = value;
    if (canvasRef.current) {
      canvasRef.current.style.cursor = value ? "grabbing" : "grab";
    }
  };

  const updateMovement = (clientX: number) => {
    if (pointerInteracting.current !== null) {
      const delta = clientX - pointerInteracting.current;
      pointerInteractionMovement.current = delta;
      r.current = delta / 200;
    }
  };

  const onRender = useCallback(() => {
    if (!pointerInteracting.current) phi.current += 0.005;
    return {
      phi: phi.current + r.current,
      width: width.current * 2,
      height: width.current * 2,
    };
  }, []);

  const onResize = () => {
    if (canvasRef.current) {
      width.current = canvasRef.current.offsetWidth;
    }
  };

  useEffect(() => {
    window.addEventListener("resize", onResize);
    onResize();

    const globe = createGlobe(canvasRef.current!, {
      ...config,
      width: width.current * 2,
      height: width.current * 2,
      onRender: (state) => {
        const result = onRender();
        if (state.marker) {
          setHoveredMarker(state.marker as Marker);
        }
        return result;
      },
    });

    setTimeout(() => {
      if (canvasRef.current) {
        canvasRef.current.style.opacity = "1";
      }
    });

    return () => globe.destroy();
  }, [config, onRender]);

  const handleMouseMove = (e: React.MouseEvent) => {
    updateMovement(e.clientX);
    setMousePosition({ x: e.clientX, y: e.clientY });
  };

  return (
    <div
      className={cn(
        "absolute inset-0 mx-auto aspect-[1/1] w-full max-w-[600px]",
        className
      )}
    >
      <canvas
        className={cn(
          "size-full opacity-0 transition-opacity duration-500 [contain:layout_paint_size]"
        )}
        ref={canvasRef}
        onPointerDown={(e) =>
          updatePointerInteraction(
            e.clientX - pointerInteractionMovement.current
          )
        }
        onPointerUp={() => updatePointerInteraction(null)}
        onPointerOut={() => {
          updatePointerInteraction(null);
          setHoveredMarker(null);
        }}
        onMouseMove={handleMouseMove}
        onTouchMove={(e) => e.touches[0] && updateMovement(e.touches[0].clientX)}
      />
      {hoveredMarker && hoveredMarker.label && (
        <div
          className="absolute pointer-events-none bg-black/75 text-white px-2 py-1 rounded-md text-sm"
          style={{
            left: mousePosition.x + 10,
            top: mousePosition.y + 10,
          }}
        >
          {hoveredMarker.label}
        </div>
      )}
    </div>
  );
}
