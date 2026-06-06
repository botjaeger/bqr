"use client";

import { useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function DrawingCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawing = useRef<boolean>(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  }, []);

  function getContext() {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    return canvas.getContext("2d");
  }

  function handleMouseDown(e: React.MouseEvent<HTMLCanvasElement>) {
    const ctx = getContext();
    if (!ctx) return;
    isDrawing.current = true;
    ctx.beginPath();
    ctx.moveTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY);
  }

  function handleMouseMove(e: React.MouseEvent<HTMLCanvasElement>) {
    if (!isDrawing.current) return;
    const ctx = getContext();
    if (!ctx) return;
    ctx.lineTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY);
    ctx.stroke();
  }

  function handleMouseUp() {
    isDrawing.current = false;
  }

  function handleMouseLeave() {
    isDrawing.current = false;
  }

  function handleClear() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <canvas
        ref={canvasRef}
        width={600}
        height={600}
        className="border border-border rounded-md bg-white cursor-crosshair"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
      />
      <Button onClick={handleClear}>Clear</Button>
    </div>
  );
}
