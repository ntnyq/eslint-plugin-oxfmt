import { fileURLToPath, URL } from 'node:url'

export const workersDir = fileURLToPath(new URL('../workers', import.meta.url))
