import { cors, type ApiRequest, type ApiResponse } from './_lib/http'
import { defaultPomodoroDb, envToken } from './_lib/notion'

export default function handler(req: ApiRequest, res: ApiResponse): void {
  if (cors(req, res)) return
  res.status(200).json({
    ok: true,
    notion: envToken() ? 'configured' : 'missing',
    defaultDb: defaultPomodoroDb() ? 'configured' : 'missing',
    oauth: process.env.NOTION_OAUTH_CLIENT_ID?.trim() ? 'configured' : 'missing',
    sealKey: process.env.NWH_SEAL_KEY?.trim() ? 'configured' : 'missing',
  })
}
