import { cors, type ApiRequest, type ApiResponse } from './_lib/http'
import { defaultPomodoroDb, notionToken } from './_lib/notion'

export default function handler(req: ApiRequest, res: ApiResponse): void {
  if (cors(req, res)) return
  res.status(200).json({
    ok: true,
    notion: notionToken() ? 'configured' : 'missing',
    defaultDb: defaultPomodoroDb() ? 'configured' : 'missing',
  })
}
