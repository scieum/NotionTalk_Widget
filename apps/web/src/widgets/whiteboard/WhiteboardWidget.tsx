import type { WhiteboardConfig } from '@nwh/core'
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Eraser,
  Highlighter,
  Pencil,
  Plus,
  Sparkles,
  Trash2,
} from 'lucide-react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import { useEffect, useRef, useState } from 'react'
import type { WidgetProps } from '../types'

type Board = WhiteboardConfig['board']
type Tool = 'pen' | 'highlighter' | 'laser' | 'eraser'

interface InkOption {
  ink: string
  label: string
}

/** 포인터 펜 획 — 잠깐 유지됐다가 알아서 사라진다 */
interface LaserStroke {
  points: { x: number; y: number }[]
  color: string
  width: number
  /** null = 아직 그리는 중(항상 선명), 값 = 획이 끝난 시각(performance.now) */
  endedAt: number | null
}

/** 획이 끝난 뒤 선명하게 유지되는 시간 → 이후 서서히 사라짐 */
const LASER_HOLD_MS = 1200
const LASER_FADE_MS = 900

const BOARD_LABEL: Record<Board, string> = {
  white: '화이트보드',
  black: '블랙보드',
  green: '초록 칠판',
}

/** 필기 색상은 실제 마커/분필 색을 재현 — UI 액센트 토큰과 무관한 콘텐츠 색이라 리터럴 값 사용 */
const PALETTES: Record<Board, InkOption[]> = {
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

/** 형광펜 색상 — 반투명 + blend 로 실제 형광펜처럼 겹치면 진해짐 */
const HIGHLIGHTER_PALETTES: Record<Board, InkOption[]> = {
  white: [
    { ink: '#fef08a', label: '노랑 형광펜' },
    { ink: '#bbf7d0', label: '초록 형광펜' },
    { ink: '#bfdbfe', label: '파랑 형광펜' },
    { ink: '#fbcfe8', label: '분홍 형광펜' },
  ],
  black: [
    { ink: '#fef08a', label: '노랑 형광펜' },
    { ink: '#bbf7d0', label: '초록 형광펜' },
    { ink: '#bfdbfe', label: '파랑 형광펜' },
    { ink: '#fbcfe8', label: '분홍 형광펜' },
  ],
  green: [
    { ink: '#fef08a', label: '노랑 형광펜' },
    { ink: '#bbf7d0', label: '초록 형광펜' },
    { ink: '#bfdbfe', label: '파랑 형광펜' },
    { ink: '#fbcfe8', label: '분홍 형광펜' },
  ],
}

/** 포인터 펜 색상 — 어느 보드에서든 잘 보이는 고채도 색 */
const LASER_PALETTES: Record<Board, InkOption[]> = {
  white: [
    { ink: '#ef4444', label: '빨강 포인터' },
    { ink: '#f59e0b', label: '주황 포인터' },
    { ink: '#3b82f6', label: '파랑 포인터' },
  ],
  black: [
    { ink: '#f87171', label: '빨강 포인터' },
    { ink: '#fbbf24', label: '노랑 포인터' },
    { ink: '#60a5fa', label: '파랑 포인터' },
  ],
  green: [
    { ink: '#f87171', label: '빨강 포인터' },
    { ink: '#fbbf24', label: '노랑 포인터' },
    { ink: '#60a5fa', label: '파랑 포인터' },
  ],
}

/** 흰 보드 위 형광펜은 곱하기(진해짐), 어두운 칠판 위에서는 스크린(밝아짐)이 자연스럽다 */
const HIGHLIGHTER_BLEND: Record<Board, GlobalCompositeOperation> = {
  white: 'multiply',
  black: 'screen',
  green: 'screen',
}

const WIDTHS = [3, 6, 10]
const ERASER_SIZES = [16, 32, 56]

export default function WhiteboardWidget({ config }: WidgetProps<WhiteboardConfig>) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const overlayRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const drawingRef = useRef(false)
  const lastPointRef = useRef<{ x: number; y: number } | null>(null)
  const laserStrokesRef = useRef<LaserStroke[]>([])
  const activeLaserRef = useRef<LaserStroke | null>(null)
  const laserRafRef = useRef<number | null>(null)
  /** 페이지별 그림 스냅샷(dataURL) — null = 빈 페이지 */
  const pagesRef = useRef<(string | null)[]>([null])

  // 보드 종류는 그림처럼 세션성 상태로 취급 — 설정의 기본값에서 시작해 위젯 안에서 바로 전환
  const [board, setBoard] = useState<Board>(config.board)
  const [tool, setTool] = useState<Tool>('pen')
  const [color, setColor] = useState(PALETTES[config.board][0]!.ink)
  const [width, setWidth] = useState(WIDTHS[1]!)
  const [eraserSize, setEraserSize] = useState(ERASER_SIZES[1]!)
  const [pageIndex, setPageIndex] = useState(0)
  const [pageCount, setPageCount] = useState(1)

  const palette =
    tool === 'highlighter'
      ? HIGHLIGHTER_PALETTES[board]
      : tool === 'laser'
        ? LASER_PALETTES[board]
        : PALETTES[board]

  useEffect(() => {
    setBoard(config.board)
  }, [config.board])

  useEffect(() => {
    setColor(palette[0]!.ink)
    // 보드나 도구가 바뀌면 그 팔레트의 첫 색으로 리셋
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [board, tool])

  // 캔버스 크기를 컨테이너에 맞춤 — 리사이즈 시 이전 내용을 스냅샷으로 보존
  useEffect(() => {
    const canvas = canvasRef.current
    const overlay = overlayRef.current
    const container = containerRef.current
    if (!canvas || !overlay || !container) return

    const resize = () => {
      const dpr = window.devicePixelRatio || 1
      const { width: cw, height: ch } = container.getBoundingClientRect()
      if (cw === 0 || ch === 0) return
      const snapshot = canvas.toDataURL('image/png')
      for (const c of [canvas, overlay]) {
        c.width = Math.round(cw * dpr)
        c.height = Math.round(ch * dpr)
        c.style.width = `${cw}px`
        c.style.height = `${ch}px`
        const cctx = c.getContext('2d')
        if (!cctx) continue
        cctx.scale(dpr, dpr)
        cctx.lineCap = 'round'
        cctx.lineJoin = 'round'
      }
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      const img = new Image()
      img.onload = () => ctx.drawImage(img, 0, 0, cw, ch)
      img.src = snapshot
    }

    resize()
    const observer = new ResizeObserver(resize)
    observer.observe(container)
    return () => observer.disconnect()
  }, [])

  useEffect(
    () => () => {
      if (laserRafRef.current !== null) cancelAnimationFrame(laserRafRef.current)
    },
    [],
  )

  const cssSize = () => {
    const canvas = canvasRef.current!
    const dpr = window.devicePixelRatio || 1
    return { w: canvas.width / dpr, h: canvas.height / dpr }
  }

  /** 오버레이에 포인터 획들을 그리는 rAF 루프 — 획이 남아 있는 동안만 돈다 */
  const renderLasers = () => {
    const overlay = overlayRef.current
    const ctx = overlay?.getContext('2d')
    if (!overlay || !ctx) {
      laserRafRef.current = null
      return
    }
    const now = performance.now()
    laserStrokesRef.current = laserStrokesRef.current.filter(
      (s) => s.endedAt === null || now - s.endedAt < LASER_HOLD_MS + LASER_FADE_MS,
    )
    const { w, h } = cssSize()
    ctx.clearRect(0, 0, w, h)
    for (const s of laserStrokesRef.current) {
      const alpha =
        s.endedAt === null || now - s.endedAt < LASER_HOLD_MS
          ? 1
          : 1 - (now - s.endedAt - LASER_HOLD_MS) / LASER_FADE_MS
      ctx.globalAlpha = alpha
      ctx.strokeStyle = s.color
      ctx.lineWidth = s.width
      ctx.shadowColor = s.color
      ctx.shadowBlur = 6
      ctx.beginPath()
      const [first, ...rest] = s.points
      if (!first) continue
      ctx.moveTo(first.x, first.y)
      if (rest.length === 0) ctx.lineTo(first.x + 0.1, first.y)
      for (const p of rest) ctx.lineTo(p.x, p.y)
      ctx.stroke()
    }
    ctx.shadowBlur = 0
    ctx.globalAlpha = 1
    laserRafRef.current =
      laserStrokesRef.current.length > 0 ? requestAnimationFrame(renderLasers) : null
  }

  const ensureLaserLoop = () => {
    if (laserRafRef.current === null) laserRafRef.current = requestAnimationFrame(renderLasers)
  }

  const point = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect()
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }

  const onPointerDown = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.setPointerCapture(e.pointerId)
    drawingRef.current = true
    const p = point(e)
    lastPointRef.current = p
    if (tool === 'laser') {
      const stroke: LaserStroke = { points: [p], color, width: width + 2, endedAt: null }
      laserStrokesRef.current.push(stroke)
      activeLaserRef.current = stroke
      ensureLaserLoop()
    }
  }

  const onPointerMove = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    const last = lastPointRef.current
    if (!canvas || !ctx || !last) return
    const current = point(e)

    if (tool === 'laser') {
      activeLaserRef.current?.points.push(current)
      lastPointRef.current = current
      return
    }

    if (tool === 'eraser') {
      // destination-out으로 실제 투명 구멍을 뚫어 보드를 바꿔도 지운 흔적이 남지 않는다
      ctx.globalCompositeOperation = 'destination-out'
      ctx.globalAlpha = 1
      ctx.strokeStyle = 'rgba(0,0,0,1)'
      ctx.lineWidth = eraserSize
    } else if (tool === 'highlighter') {
      ctx.globalCompositeOperation = HIGHLIGHTER_BLEND[board]
      ctx.globalAlpha = 0.55
      ctx.strokeStyle = color
      ctx.lineWidth = width * 3
    } else {
      ctx.globalCompositeOperation = 'source-over'
      ctx.globalAlpha = 1
      ctx.strokeStyle = color
      ctx.lineWidth = width
    }

    ctx.beginPath()
    ctx.moveTo(last.x, last.y)
    ctx.lineTo(current.x, current.y)
    ctx.stroke()
    lastPointRef.current = current
  }

  const endStroke = () => {
    drawingRef.current = false
    lastPointRef.current = null
    if (activeLaserRef.current) {
      activeLaserRef.current.endedAt = performance.now()
      activeLaserRef.current = null
    }
  }

  const wipeCanvas = () => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    ctx.save()
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.restore()
  }

  const restorePage = (index: number) => {
    wipeCanvas()
    const snap = pagesRef.current[index]
    if (!snap) return
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    const { w, h } = cssSize()
    const img = new Image()
    img.onload = () => ctx.drawImage(img, 0, 0, w, h)
    img.src = snap
  }

  const goToPage = (next: number) => {
    const canvas = canvasRef.current
    if (!canvas || next === pageIndex || next < 0 || next >= pagesRef.current.length) return
    pagesRef.current[pageIndex] = canvas.toDataURL('image/png')
    restorePage(next)
    setPageIndex(next)
  }

  const addPage = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    pagesRef.current[pageIndex] = canvas.toDataURL('image/png')
    pagesRef.current.push(null)
    wipeCanvas()
    setPageCount(pagesRef.current.length)
    setPageIndex(pagesRef.current.length - 1)
  }

  const clear = () => {
    if (!window.confirm('이 페이지 내용을 전부 지울까요?')) return
    wipeCanvas()
    pagesRef.current[pageIndex] = null
  }

  const save = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const link = document.createElement('a')
    link.download = pageCount > 1 ? `board-${pageIndex + 1}.png` : 'board.png'
    link.href = canvas.toDataURL('image/png')
    link.click()
  }

  return (
    <div className={`whiteboard whiteboard--${board}`}>
      <div className="whiteboard__toolbar">
        <div className="whiteboard__boards">
          {(Object.keys(BOARD_LABEL) as Board[]).map((b) => (
            <button
              key={b}
              type="button"
              aria-label={BOARD_LABEL[b]}
              title={BOARD_LABEL[b]}
              className={`whiteboard__board-dot whiteboard__board-dot--${b}${board === b ? ' whiteboard__board-dot--active' : ''}`}
              onClick={() => setBoard(b)}
            />
          ))}
        </div>
        <div className="whiteboard__tools">
          <button
            type="button"
            className={`whiteboard__tool${tool === 'pen' ? ' whiteboard__tool--active' : ''}`}
            onClick={() => setTool('pen')}
            aria-pressed={tool === 'pen'}
          >
            <Pencil size={16} aria-hidden /> 펜
          </button>
          <button
            type="button"
            className={`whiteboard__tool${tool === 'highlighter' ? ' whiteboard__tool--active' : ''}`}
            onClick={() => setTool('highlighter')}
            aria-pressed={tool === 'highlighter'}
          >
            <Highlighter size={16} aria-hidden /> 형광펜
          </button>
          <button
            type="button"
            title="잠깐 보였다가 저절로 사라지는 펜"
            className={`whiteboard__tool${tool === 'laser' ? ' whiteboard__tool--active' : ''}`}
            onClick={() => setTool('laser')}
            aria-pressed={tool === 'laser'}
          >
            <Sparkles size={16} aria-hidden /> 포인터
          </button>
          <button
            type="button"
            className={`whiteboard__tool${tool === 'eraser' ? ' whiteboard__tool--active' : ''}`}
            onClick={() => setTool('eraser')}
            aria-pressed={tool === 'eraser'}
          >
            <Eraser size={16} aria-hidden /> 지우개
          </button>
        </div>
        {tool !== 'eraser' && (
          <>
            <div className="whiteboard__colors">
              {palette.map((p) => (
                <button
                  key={p.ink}
                  type="button"
                  aria-label={p.label}
                  title={p.label}
                  className={`whiteboard__swatch${color === p.ink ? ' whiteboard__swatch--active' : ''}`}
                  style={{ background: p.ink }}
                  onClick={() => setColor(p.ink)}
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
          </>
        )}
        {tool === 'eraser' && (
          <div className="whiteboard__widths">
            {ERASER_SIZES.map((s) => (
              <button
                key={s}
                type="button"
                aria-label={`지우개 영역 ${s}`}
                className={`whiteboard__width${eraserSize === s ? ' whiteboard__width--active' : ''}`}
                onClick={() => setEraserSize(s)}
              >
                <span style={{ width: Math.min(s, 22), height: Math.min(s, 22) }} />
              </button>
            ))}
          </div>
        )}
        <div className="whiteboard__pages">
          <button
            type="button"
            aria-label="이전 페이지"
            disabled={pageIndex <= 0}
            onClick={() => goToPage(pageIndex - 1)}
          >
            <ChevronLeft size={14} aria-hidden />
          </button>
          <span>
            {pageIndex + 1} / {pageCount}
          </span>
          <button
            type="button"
            aria-label="다음 페이지"
            disabled={pageIndex >= pageCount - 1}
            onClick={() => goToPage(pageIndex + 1)}
          >
            <ChevronRight size={14} aria-hidden />
          </button>
          <button type="button" aria-label="페이지 추가" title="페이지 추가" onClick={addPage}>
            <Plus size={14} aria-hidden />
          </button>
        </div>
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
        <canvas ref={overlayRef} className="whiteboard__overlay" />
      </div>
    </div>
  )
}
