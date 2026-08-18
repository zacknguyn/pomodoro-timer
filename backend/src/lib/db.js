import pg from 'pg';

const { Pool } = pg;
const databaseSsl = process.env.DATABASE_SSL === 'false'
  ? false
  : {
      rejectUnauthorized: true,
      ...(process.env.DATABASE_CA_CERT
        ? { ca: process.env.DATABASE_CA_CERT.replace(/\\n/g, '\n') }
        : {}),
    };

// Module-level singleton — reused across warm Lambda invocations
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 1,                  // 1 connection per Lambda instance; RDS handles the rest
  idleTimeoutMillis: 10000, // close idle connections so Lambda doesn't hold them open
  connectionTimeoutMillis: 5000,
  ssl: databaseSsl,
});

export default pool;
