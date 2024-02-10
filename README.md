# Change Data Capture with Neon serverless Postgres, Debezium, and Redis

This repository is a companion to a blogpost on the Neon Blog. It provides a
template for getting started with [Neon](https://neon.tech) and
[Debezium](https://debezium.io) to perform Change Data Capture.

Using Change Data Capture enables you to stream database changes to messaging
infrastructure such as Kafka, Redis, and Pub/Sub systems without suffering
from data inconsistency caused by [dual writes](https://thorben-janssen.com/dual-writes/). Downstream systems can consume these messages to enable Event-Driven Architectures.

![Architecture that shows Debezium consuming changes from a Neon Postgres database and streaming the changes to Redis](/images/architecture.png)

## Getting Started

1. Obtain a Neon Postgres database.
2. Obtain a Redis instance from Upstash.
3. Define environment variables.
4. Start Debezium Server.
5. Confirm that changes are streamed to Redis.

### Configure Neon Postgres

1. Sign up to [console.neon.tech](https://console.neon.tech/) and create a project to obtain a serverless Postgres database.
1. [Enable Logical Replication](https://neon.tech/docs/guides/logical-replication-concepts#enabling-logical-replication) for your Neon project.
1. Create a table and insert data using Neon's SQL Editor:
    ```sql
    CREATE TABLE playing_with_neon(id SERIAL PRIMARY KEY, name TEXT NOT NULL, value REAL);

    INSERT INTO playing_with_neon (name, value)
    VALUES 
    ('Mario', random()),
    ('Peach', random()),
    ('Bowser', random()),
    ('Luigi', random()),
    ('Yoshi', random());
    ```

### Configure Upstash Redis

1. Sign up and create a Redis database on [console.upstash.com](https://console.upstash.com/) with the following settings:
    * Name: neon-debezium
    * Type:  Regional
    * Region: Select the region closest to your Neon Postgres database.
    * TLS (SSL) Enabled: Yes
    * Eviction: Yes

### Set Environment Variables

1. Copy the `.env.example` to a file named `.env`
1. Replace the Postgres connection parameters in `.env` with your own values from Neon
1. Replace the Redis connection parameters with your own values from Upstash.

### Start Debezium

Start a Debezium Server container, passing the `.env` file and
`application.properties` to it:

```bash
docker run --net neon-debezium-redis \
--rm \
--name debezium-server \
--env-file=.env \
-v $PWD/debezium:/debezium/conf \
debezium/server:2.5.1.Final
```

A few moments after Debezium starts, you should see that it prints logs that
confirms it has performed an initial snapshot of the `playing_with_neon` table,
and is now listening for WAL changes.

### Confirm Changes are Streamed to Redis

Visit the Data Browser for your Redis instance in Upstash and you should see
that a `debezium.public.playing_with_neon` [Redis stream](https://redis.io/docs/data-types/streams/)
has been created, and contains records corresponding to `INSERT` events from
your `playing_with_neon` table.

Perofrming more `INSERT` or `UPDATE` operations will result in new messages appearing in
the Redis stream.

![](/images/upstash-data-browser.png)

## Consuming the Change Stream

A sample application is included in the *stream-consumer/* folder. It uses the
Redis Node.js client to consume the stream of database changes in the 
`debezium.public.playing_with_neon` Redis key, and create a sum of "scores" for
each player in Redis.

For example, performing the following two `INSERT` operations would result in a
`sum:mario` key being created in Redis with a value of `2.1`:

```sql
INSERT INTO playing_with_neon (name, value) VALUES ('Mario', '1.5')
INSERT INTO playing_with_neon (name, value) VALUES ('Mario', '0.6')
```

To run the Node.js application:

1. Create a copy of the `.env.example` named `.env` in thw *stream-consumer/* folder.
1. Replace the sample values with your Upstash Redis connection parameters. Note that `rediss://` is the correct protocol to use if SSL is enabled for your Upstash Redis instance.
1. Run `npm install` to install dependencies.
1. Run `npm run` to start the application.

Once the application starts it will continuously update Redis keys as `INSERT`
events are written to the stream key by Debezium.
