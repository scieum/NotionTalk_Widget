/**
 * 알림음 — WebAudio 합성 (에셋 파일 불필요, 라이선스 문제 없음).
 * 오디오가 차단된 환경에서는 조용히 무시한다.
 */

let ctx: AudioContext | null = null

export function beep(times = 1, freq = 880): void {
  try {
    ctx ??= new AudioContext()
    if (ctx.state === 'suspended') void ctx.resume()
    const t0 = ctx.currentTime
    for (let i = 0; i < times; i++) {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.value = freq
      const at = t0 + i * 0.35
      gain.gain.setValueAtTime(0.0001, at)
      gain.gain.exponentialRampToValueAtTime(0.25, at + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.28)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(at)
      osc.stop(at + 0.3)
    }
  } catch {
    // 오디오 불가 환경 — 무음으로 동작
  }
}
