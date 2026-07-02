import 'dotenv/config'

export const env = {
  notionToken: process.env.NOTION_TOKEN?.trim() || null,
  defaultPomodoroDb: process.env.NOTION_POMODORO_DB?.trim() || null,
  port: Number(process.env.PORT) || 8787,
  dataDir: process.env.DATA_DIR?.trim() || './data',
}
