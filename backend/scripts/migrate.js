/**
 * ============================================================================
 * SUPABASE MIGRATION RUNNER: migrate.js
 * ============================================================================
 * Executes the SQL migration file against your Supabase PostgreSQL database
 * in a single command.
 *
 * Usage:
 *   npm run db:migrate
 *   - or -
 *   node backend/scripts/migrate.js
 */

const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables from backend/.env
const envPath = path.resolve(__dirname, '../.env');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

const { Client } = require('pg');

const MIGRATION_FILE = path.resolve(__dirname, '../../supabase/migrations/20261014000000_create_chat_tables.sql');

async function runMigration() {
  console.log(`=================================================`);
  console.log(`🚀 SUPABASE MIGRATION RUNNER`);
  console.log(`📄 Migration File: ${path.basename(MIGRATION_FILE)}`);
  console.log(`=================================================`);

  if (!fs.existsSync(MIGRATION_FILE)) {
    console.error(`❌ Migration file not found at: ${MIGRATION_FILE}`);
    process.exit(1);
  }

  const sql = fs.readFileSync(MIGRATION_FILE, 'utf8');

  // 1. Check for Direct Connection String (DATABASE_URL / SUPABASE_DB_URL)
  const connectionString = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;

  if (connectionString) {
    console.log(`📡 Connecting to PostgreSQL via DATABASE_URL...`);
    const client = new Client({
      connectionString,
      ssl: { rejectUnauthorized: false }
    });

    try {
      await client.connect();
      console.log(` Connected to Supabase PostgreSQL!`);
      console.log(`⏳ Executing migration statements...`);

      await client.query(sql);

      // Verify table creation
      const res = await client.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
          AND table_name IN ('conversations', 'messages');
      `);

      const tables = res.rows.map(r => r.table_name);
      console.log(`✅ Migration applied successfully!`);
      console.log(` Verified tables created:`, tables.join(', '));
      await client.end();
      process.exit(0);
    } catch (err) {
      console.error(`❌ PostgreSQL Error:`, err.message);
      await client.end();
      process.exit(1);
    }
  }

  // 2. If DATABASE_URL is not set, provide the exact one-step instruction
  const supabaseUrl = process.env.SUPABASE_URL || 'https://your-project.supabase.co';
  const projectRef = supabaseUrl.replace('https://', '').replace('.supabase.co', '').replace('/', '');

  console.log(`\nℹ️  To execute this migration automatically from the command line:`);
  console.log(`\nAdd your database password to backend/.env:`);
  console.log(`--------------------------------------------------`);
  console.log(`DATABASE_URL=postgresql://postgres.${projectRef}:[YOUR-DB-PASSWORD]@aws-0-[region].pooler.supabase.com:6543/postgres`);
  console.log(`--------------------------------------------------`);
  console.log(`Then simply run: npm run db:migrate\n`);

  console.log(`\n💡 Alternatively, using the Supabase CLI (Single Command):`);
  console.log(`--------------------------------------------------`);
  console.log(`npx supabase db push --db-url "postgresql://postgres.${projectRef}:[YOUR-PASSWORD]@..."`);
  console.log(`--------------------------------------------------\n`);

  console.log(`💡 Or via Supabase Dashboard (1-Click Paste):`);
  console.log(`1. Open: https://supabase.com/dashboard/project/${projectRef}/sql/new`);
  console.log(`2. Paste the contents of supabase/migrations/20261014000000_create_chat_tables.sql`);
  console.log(`3. Click "Run" (Ctrl+Enter)\n`);
}

runMigration().catch(err => {
  console.error('Fatal Migration Error:', err);
  process.exit(1);
});
