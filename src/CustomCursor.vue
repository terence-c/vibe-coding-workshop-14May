<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'

interface Point {
  x: number
  y: number
  t: number
}

const canvasRef = ref<HTMLCanvasElement | null>(null)
const x = ref(-100)
const y = ref(-100)
const visible = ref(false)
const overInteractive = ref(false)

const prefersReducedMotion =
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

const TRAIL_MS = 320
const points: Point[] = []
let rafId = 0
let dpr = 1

function resize() {
  const canvas = canvasRef.value
  if (!canvas) return
  dpr = window.devicePixelRatio || 1
  canvas.width = window.innerWidth * dpr
  canvas.height = window.innerHeight * dpr
  canvas.style.width = `${window.innerWidth}px`
  canvas.style.height = `${window.innerHeight}px`
}

function isInteractive(el: Element | null): boolean {
  if (!el) return false
  try {
    return window.getComputedStyle(el).cursor === 'pointer'
  } catch {
    return false
  }
}

function onPointerMove(e: PointerEvent) {
  if (e.pointerType === 'touch') return
  x.value = e.clientX
  y.value = e.clientY
  visible.value = true
  points.push({ x: e.clientX, y: e.clientY, t: performance.now() })
}

function onPointerOver(e: PointerEvent) {
  if (e.pointerType === 'touch') return
  overInteractive.value = isInteractive(e.target as Element)
}

function onDocumentLeave() {
  visible.value = false
}

function onDocumentEnter() {
  visible.value = true
}

function strokeSegments(
  ctx: CanvasRenderingContext2D,
  now: number,
  color: (alpha: number) => string,
  baseWidth: number,
  taperWidth: number,
) {
  for (let i = 1; i < points.length; i++) {
    const p0 = points[i - 1]
    const p1 = points[i]
    const age = Math.min(1, (now - p1.t) / TRAIL_MS)
    const a = 1 - age
    if (a <= 0) continue
    ctx.strokeStyle = color(a)
    ctx.lineWidth = baseWidth + taperWidth * a
    ctx.beginPath()
    ctx.moveTo(p0.x, p0.y)
    ctx.lineTo(p1.x, p1.y)
    ctx.stroke()
  }
}

function draw() {
  rafId = requestAnimationFrame(draw)
  const canvas = canvasRef.value
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  ctx.clearRect(0, 0, canvas.width, canvas.height)

  const now = performance.now()
  while (points.length && now - points[0].t > TRAIL_MS) points.shift()
  if (points.length < 2) return

  ctx.save()
  ctx.scale(dpr, dpr)
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'

  // Layer 1 — soft pink halo (--pink)
  strokeSegments(ctx, now, (a) => `rgba(255, 218, 213, ${a * 0.45})`, 6, 22)
  // Layer 2 — red beam (--danger, same as "Everything")
  strokeSegments(ctx, now, (a) => `rgba(229, 57, 45, ${a * 0.85})`, 2, 8)
  // Layer 3 — deep red inner stroke (--danger-dark)
  strokeSegments(ctx, now, (a) => `rgba(196, 26, 15, ${a * 0.9})`, 1, 3)
  // Layer 4 — hot near-white core
  strokeSegments(ctx, now, (a) => `rgba(255, 248, 223, ${a})`, 0.5, 2)

  // Bright head spot — the laser's beam tip
  const head = points[points.length - 1]
  ctx.shadowColor = '#e5392d'
  ctx.shadowBlur = 18
  ctx.fillStyle = 'rgba(255, 252, 240, 0.95)'
  ctx.beginPath()
  ctx.arc(head.x, head.y, 3.2, 0, Math.PI * 2)
  ctx.fill()

  ctx.restore()
}

onMounted(() => {
  if (prefersReducedMotion) return
  resize()
  window.addEventListener('resize', resize)
  window.addEventListener('pointermove', onPointerMove, { passive: true })
  window.addEventListener('pointerover', onPointerOver, { passive: true })
  document.documentElement.addEventListener('pointerleave', onDocumentLeave)
  document.documentElement.addEventListener('pointerenter', onDocumentEnter)
  rafId = requestAnimationFrame(draw)
})

onUnmounted(() => {
  if (rafId) cancelAnimationFrame(rafId)
  window.removeEventListener('resize', resize)
  window.removeEventListener('pointermove', onPointerMove)
  window.removeEventListener('pointerover', onPointerOver)
  document.documentElement.removeEventListener('pointerleave', onDocumentLeave)
  document.documentElement.removeEventListener('pointerenter', onDocumentEnter)
})
</script>

<template>
  <canvas
    v-if="!prefersReducedMotion"
    ref="canvasRef"
    class="custom-cursor__trail"
    aria-hidden="true"
  ></canvas>
  <div
    v-if="!prefersReducedMotion"
    class="custom-cursor"
    :class="{ 'is-over-interactive': overInteractive, 'is-visible': visible }"
    :style="{ transform: `translate(${x}px, ${y}px)` }"
    aria-hidden="true"
  >
    <span class="custom-cursor__ring"></span>
  </div>
</template>

<style scoped>
.custom-cursor__trail {
  position: fixed;
  inset: 0;
  width: 100vw;
  height: 100vh;
  pointer-events: none;
  z-index: 9999;
}

.custom-cursor {
  position: fixed;
  top: 0;
  left: 0;
  pointer-events: none;
  z-index: 10000;
  opacity: 0;
  transition: opacity 180ms ease;
  will-change: transform;
}

.custom-cursor.is-visible {
  opacity: 1;
}

.custom-cursor__ring {
  position: absolute;
  top: 0;
  left: 0;
  border-radius: 50%;
  transform: translate(-50%, -50%);
  width: 0;
  height: 0;
  border: 0 solid transparent;
  background: transparent;
  opacity: 0;
  transition:
    width 220ms cubic-bezier(0.2, 0.8, 0.2, 1),
    height 220ms cubic-bezier(0.2, 0.8, 0.2, 1),
    border-width 200ms ease,
    opacity 200ms ease;
}

.is-over-interactive .custom-cursor__ring {
  width: 34px;
  height: 34px;
  border: 2px solid #e5392d;
  background: rgba(229, 57, 45, 0.08);
  box-shadow: 0 0 18px rgba(229, 57, 45, 0.25);
  opacity: 1;
}

@media (hover: none) {
  .custom-cursor,
  .custom-cursor__trail {
    display: none;
  }
}
</style>
