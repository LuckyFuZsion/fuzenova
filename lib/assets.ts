import 'server-only'
import { existsSync } from 'node:fs'
import path from 'node:path'

export function assetExists(src: string) {
  return existsSync(path.join(process.cwd(), 'public', src))
}
