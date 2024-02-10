import { getClient } from "./client"
import { getConfig } from "./config"
import { getLogger } from "./log"
import { getDebeziumMessageProcessor } from "./message-processor"

async function main() {
  const config = getConfig(process.env)
  const log = getLogger(config.LOG_LEVEL)
  
  log.info('creating redis client')
  const client = await getClient(config, log)
  
  const processMessage = getDebeziumMessageProcessor(log, client)
  
  const { REDIS_GROUP_ID, REDIS_STREAMS_KEY, REDIS_CONSUMER_ID } = config
  
  // Create a consumer group, or continue on if it already exists
  await createConsumerGroup()
  
  // Start the recursive message consumption process
  consumeMessages()

  async function consumeMessages () {
    log.info(`performing XREADGROUP. will block until messages are received`)
    try {
      const res = await client.xReadGroup(
        REDIS_GROUP_ID, REDIS_CONSUMER_ID,
        {
          key: REDIS_STREAMS_KEY,
          // Read undelivered messages. Change to '0' to read from the beginning
          // of the stream each time this consumer process starts
          id: '>'
        },
        {
          // BLOCK value of 0 means we'll wait indefinitely for messages to arrive
          BLOCK: 0,
          // COUNT of 10 means we'll consume in batches of 10 at a time
          COUNT: 10
        }
      )

      log.trace('returned results from XREADGROUP: %j', res)

      if (res) {
        for (const { id, message } of res[0].messages) {
          log.debug('processing message %j:', { id, message })
          
          await processMessage(message)

          log.debug(`xack message with id: ${id}`)
          await client.xAck(REDIS_STREAMS_KEY, REDIS_GROUP_ID, id)
        }
      }

      log.info('processed block or messages. scheduling next XREADGROUP')
      setTimeout(() => consumeMessages())
    } catch (e) {
      log.error('error performing XREADGROUP:')
      log.error(e)

      log.warn('will resume and retry reading messages in 5 seconds')
      setTimeout(() => consumeMessages(), 5000)
    }
  }

  async function createConsumerGroup() {
    try {
      log.info(`create read group with stream key "${REDIS_STREAMS_KEY}" and group:consumer "${REDIS_GROUP_ID}:${REDIS_CONSUMER_ID}"`)
      await client.xGroupCreate(REDIS_STREAMS_KEY, REDIS_GROUP_ID, '0');
    } catch (e: unknown) {
      if (e instanceof Error) {
        // Ignore busy group errors since it's possible the group might already
        // exist, but throw other errors
        if (e.message.includes('BUSYGROUP') === false) {
          throw e
        }
      } else {
        log.error(e)
        throw new Error('error creating redis group. check prior logs')
      }
    }  
  }
}

main()
