import type { WhiteboardConfig } from '@nwh/core'
import { Download, Eraser, Trash2 } from 'lucide-react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import { useEffect, useRef, useState } from 'react'
import type { WidgetProps } from '../types'

interface InkOption {
  ink: string
  label: string
}

/** 필기 색상은 실제 마커/분필 색을 재현 — UI 액센트 토큰과 무관한 콘텐츠 색이라 리터럴 값 사용 */
const PALETTES: Record<WhiteboardConfig['board'], InkOption[]> = {
  white: [
    { ink: '#1f2933', label: '검정' },
    { ink: '#d64545', label: '빨강' },
    { ink: '#2563eb', label: '파랑' },
    { ink: '#16a34a', label: '초록' },
  ],
  black: [
    { ink: '#ffffff', label: '흰 분필' },
    { ink: '#fde68a', label: '노랑 분필' },
    { ink: '#f9a8d4', label: '분홍 분필' },
    { ink: '#93c5fd', label: '하늘 분필' },
  ],
  green: [
    { ink: '#ffffff', label: '흰 분필' },
    { ink: '#fde68a', label: '노랑 분필' },
    { ink: '#f9a8d4', label: '분홍 분필' },
    { ink: '#93c5fd', label: '하늘 분필' },
  ],
}

const BOARD_FACE: Record<WhiteboardConfig['board'], string> = {
  white: '#fbfbf9',
  black: '#1c2b22',
  green: '#1f4d3a',
}

const WIDTHS = [3, 6, 10]

export default function WhiteboardWidget({ config }: WidgetProps<WhiteboardConfig>) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const drawingRef = useRef(false)
  const lastPointRef = useRef<{ x: number; y: number } | null>(null)

  const palette = PALETTES[config.board]
  const [color, setColor] = useState(palette[0]!.ink)
  const [width, setWidth] = useState(WIDTHS[1]!)
  const [erasing, setErasing] = useState(false)

  useEffect(() => {
    setColor(PALETTES[config.board][0]!.ink)
    setErasing(false)
  }, [config.board])

  // 캔버스 크기를 컨테이너에 맞춤 — 리사이즈 시 이전 내용을 스냅샷으로 보존
  useEffect(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return

    const resize = () => {
      const dpr = window.devicePixelRatio || 1
      const { width: cw, height: ch } = container.getBoundingClientRect()
      if (cw === 0 || ch === 0) return
      const snapshot = canvas.toDataURL('image/png')
      canvas.width = Math.round(cw * dpr)
      canvas.height = Math.round(ch * dpr)
      canvas.style.width = `${cw}px`
      canvas.style.height = `${ch}px`
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      ctx.scale(dpr, dpr)
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      const img = new Image()
      img.onload = () => ctx.drawImage(img, 0, 0, cw, ch)
      img.src = snapshot
    }

    resize()
    const observer = new ResizeObserver(resize)
    observer.observe(container)
    return () => observer.disconnect()
  }, [])

  const point = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect()
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }

  const onPointerDown = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.setPointerCapture(e.pointerId)
    drawingRef.current = true
    lastPointRef.current = point(e)
  }

  const onPointerMove = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    const last = lastPointRef.current
    if (!canvas || !ctx || !last) return
    const current = point(e)
    ctx.strokeStyle = erasing ? BOARD_FACE[config.board] : color
    ctx.lineWidth = erasing ? width * 3 : width
    ctx.beginPath()
    ctx.moveTo(last.x, last.y)
    ctx.lineTo(current.x, current.y)
    ctx.stroke()
    lastPointRef.current = current
  }

  const endStroke = () => {
    drawingRef.current = false
    lastPointRef.current = null
  }

  const clear = () => {
    if (!window.confirm('보드 내용을 전부 지울까요?')) return
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
  }

  const save = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const link = document.createElement('a')
    link.download = 'board.png'
    link.href = canvas.toDataURL('image/png')
    link.click()
  }

  return (
    <div className={`whiteboard whiteboard--${config.board}`}>
      <div className="whiteboard__toolbar">
        <div className="whiteboard__colors">
          {palette.map((p) => (
            <button
              key={p.ink}
              type="button"
              aria-label={p.label}
              title={p.label}
              className={`whiteboard__swatch${!erasing && color === p.ink ? ' whiteboard__swatch--active' : ''}`}
              style={{ background: p.ink }}
              onClick={() => {
                setErasing(false)
                setColor(p.ink)
              }}
            />
          ))}
        </div>
        <div className="whiteboard__widths">
          {WIDTHS.map((w) => (
            <button
              key={w}
              type="button"
              aria-label={`굵기 ${w}`}
              className={`whiteboard__width${width === w ? ' whiteboard__width--active' : ''}`}
              onClick={() => setWidth(w)}
            >
              <span style={{ width: w, height: w }} />
            </button>
          ))}
        </div>
        <button
          type="button"
          className={`whiteboard__tool${erasing ? ' whiteboard__tool--active' : ''}`}
          onClick={() => setErasing((v) => !v)}
          aria-pressed={erasing}
        >
          <Eraser size={16} aria-hidden /> 지우개
        </button>
        <button type="button" className="whiteboard__tool" onClick={clear}>
          <Trash2 size={16} aria-hidden /> 전체 지우기
        </button>
        <button type="button" className="whiteboard__tool" onClick={save}>
          <Download size={16} aria-hidden /> 저장
        </button>
      </div>
      <div ref={containerRef} className="whiteboard__surface">
        <canvas
          ref={canvasRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endStroke}
          onPointerLeave={endStroke}
          onPointerCancel={endStroke}
        />
      </div>
    </div>
  )
}
