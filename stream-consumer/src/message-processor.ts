import pino from "pino"
import type { getClient } from "./client";

export function getDebeziumMessageProcessor (log: pino.Logger, client: Awaited<ReturnType<typeof getClient>>) {
  return async function processMessages(message: RedisStreamMessage['message']) {
    const cms = Object.keys(message).map(id => {
      return JSON.parse(message[id]) as DebeziumMessageParsed<Schema>
    })

    for (const cm of cms) {
      const key = `sum:${cm.after.name.toLowerCase()}`
      
      log.info(`increment key "${key}" by "${cm.after.value}"`)

      await client.incrByFloat(key, cm.after.value)
    }
  }
}

export type RedisStreamMessage = {
  id: string;
  message: {
      [x: string]: string;
  };
}

export type Schema = {
  id: number
  name: string
  value: number
}

export type DebeziumMessageParsed<T> = {
  before: null|T
  after: T
  source: {
    /**
     * A value similar to "2.5.1.Final".
     */
    version: string
    /**
     * In this case it'll always be "postgresql", but can varies
     * depending on the source connector being used.
     */
    connector: string
    /**
     * The value of `debezium.source.database.server.name` from the Debezium
     * server's appliaction.properties.
     */
    name: string,
    /**
     * Time when this change or event happened in the database.
     */
    ts_ms: number,
    /**
     * Indicates if this messages was generated as part of initial snapshotting.
     * More information at: https://debezium.io/documentation/reference/stable/connectors/postgresql.html#postgresql-snapshots
     */
    snapshot: boolean
    /**
     * Name of the source database.
     */
    db: string
    /**
     * Prior and current LSN values.
     */
    sequence: `["${string}","${string}"]`
    /**
     * The originating database schema, e.g "public"
     */
    schema: string
    /**
     * The database table name.
     */
    table: string
    txId: number
    lsn: number
    xmin: null
  },
  /**
   * Describes the type of operation that generated the event. The usual CRUD
   * event types apply, as do 't' (truncate) and 'm' (message)
   */
  op: 'c' | 'r' | 'u' | 'd' | 't' | 'm',
  /**
   * Time at which the connector processed this event.
   */
  ts_ms: number,
  transaction: null
}
