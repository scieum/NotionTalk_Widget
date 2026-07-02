import express from 'express'
import { env } from './env'
import { notionRouter } from './routes/notion'
import { pomodoroRouter } from './routes/pomodoro'

const app = express()
app.use(express.json())

// 웹(정적 배포)과 서버가 다른 도메인일 수 있어 CORS 허용.
// 위젯 토큰 도입 전까지는 쓰기 API가 세션 UUID 멱등성으로만 보호된다.
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
  if (req.method === 'OPTIONS') {
    res.sendStatus(204)
    return
  }
  next()
})

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    notion: env.notionToken ? 'configured' : 'missing',
    defaultDb: env.defaultPomodoroDb ? 'configured' : 'missing',
  })
})

app.use('/api/pomodoro', pomodoroRouter)
app.use('/api/notion', notionRouter)

app.listen(env.port, () => {
  console.log(`[nwh-server] http://localhost:${env.port}`)
  if (!env.notionToken) {
    console.log('[nwh-server] NOTION_TOKEN 미설정 — 기록 API는 503을 반환합니다 (.env 참조)')
  }
})
