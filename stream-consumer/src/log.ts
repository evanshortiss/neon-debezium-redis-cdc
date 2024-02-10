import  pino from 'pino'
import { ApplicationConfig } from './config'

export function getLogger (level: ApplicationConfig['LOG_LEVEL']) {
  return pino({ level })
}
