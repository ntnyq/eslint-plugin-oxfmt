import { fileURLToPath, URL } from 'node:url'

export const dirWorkers = fileURLToPath(new URL('../workers', import.meta.url))
