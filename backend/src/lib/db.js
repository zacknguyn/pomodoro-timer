import pg from 'pg';

const { Pool } = pg;

// Module-level singleton — reused across warm Lambda invocations
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 1,                  // 1 connection per Lambda instance; RDS handles the rest
  idleTimeoutMillis: 10000, // close idle connections so Lambda doesn't hold them open
  connectionTimeoutMillis: 5000,
  ssl: process.env.DATABASE_SSL === 'false' ? false : { rejectUnauthorized: false },
});

export default pool;
