"use client";

import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type PointerEvent, type WheelEvent } from "react";

export interface FlyerCropperProps {
  src: string;
  onApply: (blob: Blob) => void;
  onCancel: () => void;
}

const TARGET_W = 1280;
const TARGET_H = 960;
const NUDGE = 24;

interface Box {
  w: number;
  h: number;
}

export function FlyerCropper({ src, onApply, onCancel }: FlyerCropperProps) {
  const clipRef = useRef<HTMLDivElement | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const drag = useRef<{ px: number; py: number; ox: number; oy: number } | null>(null);

  const [nat, setNat] = useState<Box | null>(null);
  const [dims, setDims] = useState<Box | null>(null);
  const [s, setS] = useState(1);
  const [off, setOff] = useState({ x: 0, y: 0 });
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const fit = useCallback(() => {
    if (!nat || !dims) return 1;
    return Math.max(dims.w / nat.w, dims.h / nat.h);
  }, [nat, dims]);

  const eff = fit() * s;

  const clampOff = useCallback(
    (x: number, y: number) => {
      if (!nat || !dims) return { x, y };
      const dispW = nat.w * fit() * s;
      const dispH = nat.h * fit() * s;
      const maxX = Math.max(0, dispW - dims.w);
      const maxY = Math.max(0, dispH - dims.h);
      return {
        x: Math.min(0, Math.max(-maxX, x)),
        y: Math.min(0, Math.max(-maxY, y)),
      };
    },
    [nat, dims, fit, s],
  );

  useEffect(() => {
    const el = clipRef.current;
    if (!el) return;
    const update = () => setDims({ w: el.clientWidth, h: el.clientHeight });
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const img = imgRef.current;
    if (!img) return;
    const onLoad = () => setNat({ w: img.naturalWidth, h: img.naturalHeight });
    if (img.complete) onLoad();
    img.addEventListener("load", onLoad);
    return () => img.removeEventListener("load", onLoad);
  }, [src]);

  useEffect(() => {
    // keep the image covering the crop box after zoom changes
    if (!nat || !dims) return;
    const dispW = nat.w * eff;
    const dispH = nat.h * eff;
    setOff((o) => clampOff(o.x, o.y));
    void dispW;
    void dispH;
  }, [nat, dims, fit, s, eff, clampOff]);

  useEffect(() => {
    const el = clipRef.current;
    if (!el) return;
    const onWheel = (e: globalThis.WheelEvent) => {
      e.preventDefault();
      setS((v) => Math.min(4, Math.max(1, Math.round((v + (e.deltaY < 0 ? 0.1 : -0.1)) * 100) / 100)));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  function onPointerDown(e: PointerEvent<HTMLDivElement>) {
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { px: e.clientX, py: e.clientY, ox: off.x, oy: off.y };
  }

  function onPointerMove(e: PointerEvent<HTMLDivElement>) {
    const d = drag.current;
    if (!d || !nat) return;
    setOff(clampOff(d.ox + (e.clientX - d.px), d.oy + (e.clientY - d.py)));
  }

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key.startsWith("Arrow")) {
      e.preventDefault();
      const dx = e.key === "ArrowLeft" ? NUDGE : e.key === "ArrowRight" ? -NUDGE : 0;
      const dy = e.key === "ArrowUp" ? NUDGE : e.key === "ArrowDown" ? -NUDGE : 0;
      setOff(clampOff(off.x + dx, off.y + dy));
    }
  }

  function apply() {
    if (!nat || !dims || !imgRef.current) return;
    setBusy(true);
    setErr(null);
    const effScale = fit() * s;
    const sx = -off.x / effScale;
    const sy = -off.y / effScale;
    const sw = dims.w / effScale;
    const sh = dims.h / effScale;
    const canvas = document.createElement("canvas");
    canvas.width = TARGET_W;
    canvas.height = TARGET_H;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      setBusy(false);
      setErr("This browser could not process the image");
      return;
    }
    ctx.fillStyle = "#0c0f16";
    ctx.fillRect(0, 0, TARGET_W, TARGET_H);
    ctx.drawImage(imgRef.current, sx, sy, sw, sh, 0, 0, TARGET_W, TARGET_H);
    canvas.toBlob((blob) => {
      setBusy(false);
      if (blob) onApply(blob);
      else setErr("Could not encode the cropped image");
    }, "image/jpeg", 0.9);
  }

  const dispW = nat && dims ? nat.w * eff : 0;
  const dispH = nat && dims ? nat.h * eff : 0;

  return (
    <div className="flyer-editor-overlay">
      <div className="flyer-editor" role="dialog" aria-modal="true" aria-label="Crop flyer so it fits the event card">
        <div className="row-between">
          <div className="stack" style={{ gap: 2 }}>
            <h3 style={{ fontSize: 18 }}>Fit the flyer</h3>
            <p className="meta">Drag to position, wheel or slider to zoom. The frame is 4:3 — what fits inside is what gets uploaded.</p>
          </div>
          <button className="btn btn-secondary minia" onClick={onCancel} aria-label="Cancel cropping">
            ✕
          </button>
        </div>

        <div
          ref={clipRef}
          className="crop-clip"
          role="group"
          aria-label="Crop area — drag to move, arrow keys to nudge, wheel to zoom"
          tabIndex={0}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={() => (drag.current = null)}
          onPointerCancel={() => (drag.current = null)}
          onKeyDown={onKeyDown}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- in-editor canvas crop source */}
          <img
            ref={imgRef}
            src={src}
            alt=""
            draggable={false}
            style={{
              width: dispW || undefined,
              height: dispH || undefined,
              left: off.x,
              top: off.y,
            }}
          />
        </div>

        <div className="crop-zoom">
          <button className="btn btn-secondary minia" onClick={() => setS((v) => Math.max(1, v - 0.1))} aria-label="Zoom out">
            −
          </button>
          <input
            type="range"
            min={1}
            max={4}
            step={0.01}
            value={s}
            onChange={(e) => setS(Number(e.target.value))}
            aria-label="Zoom level"
          />
          <button className="btn btn-secondary minia" onClick={() => setS((v) => Math.min(4, v + 0.1))} aria-label="Zoom in">
            +
          </button>
          <span className="mono">{Math.round(s * 100)}%</span>
        </div>

        {err ? (
          <p className="meta" style={{ color: "var(--bad)" }}>
            {err}
          </p>
        ) : null}

        <div className="btn-row">
          <button className="btn btn-secondary" onClick={onCancel}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={apply} disabled={busy || !nat}>
            {busy ? "Preparing…" : "Apply crop & upload"}
          </button>
        </div>
      </div>
    </div>
  );
}