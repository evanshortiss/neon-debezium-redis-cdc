import { from } from 'env-var'
import pino from 'pino'

export type ApplicationConfig = {
  LOG_LEVEL: string

  REDIS_ADDRESS: string
  REDIS_USERNAME: string|undefined
  REDIS_PASSWORD: string|undefined
  REDIS_CONSUMER_ID: string
  REDIS_GROUP_ID: string
  REDIS_STREAMS_KEY: string
}

export function getConfig (env: NodeJS.ProcessEnv): ApplicationConfig {
  const  { get } = from (env)

  return {
    LOG_LEVEL: get('LOG_LEVEL').default('info').asEnum(Object.keys(pino.levels.values)),

    REDIS_ADDRESS: get('REDIS_ADDRESS').default('redis://localhost:6379').asUrlString(),
    REDIS_PASSWORD: get('REDIS_PASSWORD').asString(),
    REDIS_USERNAME: get('REDIS_USERNAME').asString(),
    REDIS_CONSUMER_ID: get('REDIS_CONSUMER_ID').default('consumer-a').asString(),
    REDIS_GROUP_ID: get('REDIS_GROUP_ID').default('pwn').asString(),
    REDIS_STREAMS_KEY: get('REDIS_STREAMS_KEY').default('debezium.public.playing_with_neon').asString()
  }
}
