import * as redis from 'redis'
import { ApplicationConfig } from './config'
import pino from 'pino'

export async function getClient (config: ApplicationConfig, log: pino.Logger) {
  const {
    REDIS_PASSWORD: password,
    REDIS_USERNAME: username,
    REDIS_ADDRESS: url
  } = config
  
  const client = redis.createClient({
    name: 'mat-view-neon',
    url,
    password,
    username
  })

  client.on('error', (err) => {
    log.error('redis client emitted an error. exiting process with status code 1')
    log.error(err)
    process.exit(1)
  })

  await client.connect()

  return client
}
