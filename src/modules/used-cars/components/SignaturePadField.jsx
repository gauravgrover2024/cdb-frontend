import React, { useCallback, useEffect, useRef } from "react";
import { Button } from "antd";
import { DeleteOutlined, EditOutlined } from "@ant-design/icons";

const PAD_HEIGHT = 170;

function getPoint(canvas, event) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top,
  };
}

export default function SignaturePadField({
  value,
  onChange,
  title = "Signature",
  subtitle,
}) {
  const wrapperRef = useRef(null);
  const canvasRef = useRef(null);
  const drawingRef = useRef(false);
  const lastPointRef = useRef(null);

  const paintBackground = useCallback((ctx, width, height) => {
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
    ctx.strokeStyle = "rgba(148, 163, 184, 0.28)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(14, height - 26);
    ctx.lineTo(width - 14, height - 26);
    ctx.stroke();
  }, []);

  const resizeCanvas = useCallback(() => {
    const wrapper = wrapperRef.current;
    const canvas = canvasRef.current;
    if (!wrapper || !canvas) return;

    const ratio = window.devicePixelRatio || 1;
    const width = Math.max(wrapper.clientWidth, 240);
    const height = PAD_HEIGHT;

    canvas.width = Math.floor(width * ratio);
    canvas.height = Math.floor(height * ratio);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    const ctx = canvas.getContext("2d");
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#0f172a";
    ctx.lineWidth = 2.2;
    paintBackground(ctx, width, height);

    if (value) {
      const img = new Image();
      img.onload = () => {
        paintBackground(ctx, width, height);
        ctx.drawImage(img, 0, 0, width, height);
      };
      img.src = value;
    }
  }, [paintBackground, value]);

  useEffect(() => {
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);
    return () => window.removeEventListener("resize", resizeCanvas);
  }, [resizeCanvas]);

  const commit = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    onChange?.(canvas.toDataURL("image/png"));
  }, [onChange]);

  const handlePointerDown = useCallback((event) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    drawingRef.current = true;
    lastPointRef.current = getPoint(canvas, event);
    canvas.setPointerCapture?.(event.pointerId);
  }, []);

  const handlePointerMove = useCallback((event) => {
    const canvas = canvasRef.current;
    if (!canvas || !drawingRef.current) return;

    const ctx = canvas.getContext("2d");
    const nextPoint = getPoint(canvas, event);
    const prevPoint = lastPointRef.current || nextPoint;

    ctx.beginPath();
    ctx.moveTo(prevPoint.x, prevPoint.y);
    ctx.lineTo(nextPoint.x, nextPoint.y);
    ctx.stroke();

    lastPointRef.current = nextPoint;
  }, []);

  const handlePointerUp = useCallback((event) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (drawingRef.current) commit();
    drawingRef.current = false;
    lastPointRef.current = null;
    canvas.releasePointerCapture?.(event.pointerId);
  }, [commit]);

  const handleClear = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    paintBackground(ctx, canvas.clientWidth || 320, PAD_HEIGHT);
    onChange?.("");
  }, [onChange, paintBackground]);

  return (
    <div className="rounded-[24px] border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-white/[0.03]">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-bold tracking-tight text-slate-900 dark:text-slate-100">
            {title}
          </p>
          {subtitle ? (
            <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">
              {subtitle}
            </p>
          ) : null}
        </div>
        <Button
          size="small"
          icon={<DeleteOutlined />}
          onClick={handleClear}
          disabled={!value}
        >
          Clear
        </Button>
      </div>

      <div
        ref={wrapperRef}
        className="overflow-hidden rounded-[20px] border border-dashed border-slate-300 bg-slate-50 dark:border-white/15 dark:bg-[#11151b]"
      >
        <canvas
          ref={canvasRef}
          className="block w-full touch-none cursor-crosshair"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
        />
      </div>

      <div className="mt-3 flex items-center justify-between gap-3 text-xs font-medium text-slate-500 dark:text-slate-400">
        <span className="inline-flex items-center gap-1.5">
          <EditOutlined /> Draw signature directly in the box
        </span>
        <span>{value ? "Signature captured" : "Awaiting signature"}</span>
      </div>
    </div>
  );
}
