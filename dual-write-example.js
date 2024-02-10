const SQL = require('@nearform/sql')

async function saveEventAndPublishMessage (data) {
  await postgres.query(
    SQL`
      INSERT INTO messages (from, to, content)
      VALUES (${data.from},${data.to},${data.content})
    `
  )

  await broker.publish(data)
}
