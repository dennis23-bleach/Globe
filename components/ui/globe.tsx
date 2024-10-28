"use client";

import createGlobe, { COBEOptions } from "cobe";
import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

const GLOBE_CONFIG: COBEOptions = {
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

interface Marker {
  location: [number, number];
  size: number;
  label: string;
}

interface GlobeRenderState {
  phi: number;
  theta: number;
  width: number;
  height: number;
  globe: {
    getProjection: () => (latLon: [number, number]) => [number, number];
  };
  [key: string]: any; // Include any additional properties
}

export function Globe({
  className,
  config = GLOBE_CONFIG,
}: {
  className?: string;
  config?: COBEOptions;
}) {
  const phi = useRef(0);
  const width = useRef(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pointerInteracting = useRef<number | null>(null);
  const pointerInteractionMovement = useRef<number>(0);
  const r = useRef(0);
  const [labels, setLabels] = useState<
    { x: number; y: number; label: string }[]
  >([]);

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

  const markersScreenPos = useRef<{ x: number; y: number; label: string }[]>(
    []
  );

  const onRender = useCallback(
    (state: Record<string, any>) => {
      // Type cast state to GlobeRenderState
      const globeState = state as GlobeRenderState;

      if (!pointerInteracting.current) phi.current += 0.005;
      globeState.phi = phi.current + r.current;
      globeState.width = width.current * 2;
      globeState.height = width.current * 2;

      // Calculate screen positions of markers
      const projection = globeState.globe.getProjection();
      markersScreenPos.current = (config.markers as Marker[]).map((marker) => {
        const [lat, lon] = marker.location;
        const [x, y] = projection([lat, lon]);
        // Transform from [-1, 1] to screen coordinates
        return {
          x: ((x + 1) / 2) * globeState.width,
          y: ((1 - y) / 2) * globeState.height,
          label: marker.label,
        };
      });
    },
    [config.markers]
  );

  const onResize = () => {
    if (canvasRef.current) {
      width.current = canvasRef.current.offsetWidth;
    }
  };

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const clickX = (e.clientX - rect.left) * 2; // Adjust for devicePixelRatio
    const clickY = (e.clientY - rect.top) * 2;

    // Find the marker closest to the click position
    const clickedMarker = markersScreenPos.current.find((marker) => {
      const dx = marker.x - clickX;
      const dy = marker.y - clickY;
      const distance = Math.sqrt(dx * dx + dy * dy);
      return distance < 10; // Adjust the threshold as needed
    });

    if (clickedMarker) {
      setLabels([clickedMarker]);
    } else {
      setLabels([]);
    }
  };

  useEffect(() => {
    window.addEventListener("resize", onResize);
    onResize();

    const globe = createGlobe(canvasRef.current!, {
      ...config,
      width: width.current * 2,
      height: width.current * 2,
      onRender,
    });

    setTimeout(() => {
      if (canvasRef.current) {
        canvasRef.current.style.opacity = "1";
      }
    });

    return () => {
      window.removeEventListener("resize", onResize);
      globe.destroy();
    };
  }, [config, onRender]);

  return (
    <div
      className={cn(
        "relative mx-auto aspect-[1/1] w-full max-w-[600px]",
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
        onPointerOut={() => updatePointerInteraction(null)}
        onMouseMove={(e) => updateMovement(e.clientX)}
        onTouchMove={(e) =>
          e.touches[0] && updateMovement(e.touches[0].clientX)
        }
        onClick={handleClick}
      />
      {/* Labels */}
      {labels.map((labelInfo, index) => (
        <div
          key={index}
          className="absolute bg-white text-black p-1 rounded"
          style={{
            left: labelInfo.x / 2 - 50, // Adjust for devicePixelRatio and label width
            top: labelInfo.y / 2 - 30, // Adjust for devicePixelRatio and label height
          }}
        >
          {labelInfo.label}
        </div>
      ))}
    </div>
  );
}
