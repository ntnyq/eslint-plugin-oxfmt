// @ts-check

import { runAsWorker } from 'synckit'
import { formatViaOxfmt } from './format.mjs'

runAsWorker(formatViaOxfmt)
