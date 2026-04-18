/**数据库直连清理工具。*/
import pg from "pg"

function getDbConfig(): pg.ClientConfig {
  const isProduction = process.env.TEST_ENV === "production"
  if (isProduction) {
    return {
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT),
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
    }
  }
  const host = "localhost"
  const port = Number(process.env.DB_EXTERNAL_PORT || "15432")
  return {
    host,
    port,
    database: process.env.DB_NAME || "mudasky",
    user: process.env.DB_USER || "mudasky",
    password: process.env.DB_PASSWORD,
  }
}

export async function cleanupE2EData(): Promise<void> {
  const client = new pg.Client(getDbConfig())
  try {
    await client.connect()
    await client.query(`
      DELETE FROM refresh_token WHERE user_id IN (SELECT id FROM "user" WHERE username LIKE 'E2E\\_239\\_%');
      DELETE FROM sms_code WHERE phone IN (SELECT phone FROM "user" WHERE username LIKE 'E2E\\_239\\_%');
      DELETE FROM document WHERE user_id IN (SELECT id FROM "user" WHERE username LIKE 'E2E\\_239\\_%');
      DELETE FROM "user" WHERE username LIKE 'E2E\\_239\\_%';
      DELETE FROM role WHERE name LIKE 'E2E\\_239%';
      DELETE FROM category WHERE slug LIKE 'e2e-239%';
      DELETE FROM article WHERE title LIKE 'E2E\\_239%';
      DELETE FROM success_case WHERE student_name LIKE 'E2E\\_239%';
      DELETE FROM university WHERE name LIKE 'E2E\\_239%';
    `)
  } finally {
    await client.end()
  }
}
