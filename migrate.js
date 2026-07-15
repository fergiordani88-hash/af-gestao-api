const { Client } = require('pg');
const client = new Client({
  connectionString: 'postgresql://postgres:Fer4734298*@db.zkotxmhvrkkiweawgofs.supabase.co:5432/postgres',
  ssl: { rejectUnauthorized: false }
});

async function run() {
  await client.connect();
  console.log('Conectado ao Supabase!');
  const sqls = [
    `ALTER TABLE "AgroDRERural" ADD COLUMN IF NOT EXISTS "recFeijaoVolume" DOUBLE PRECISION NOT NULL DEFAULT 0`,
    `ALTER TABLE "AgroDRERural" ADD COLUMN IF NOT EXISTS "recFeijaoPreco"  DOUBLE PRECISION NOT NULL DEFAULT 0`,
    `ALTER TABLE "AgroDRERural" ADD COLUMN IF NOT EXISTS "custoAtivTotal"  DOUBLE PRECISION NOT NULL DEFAULT 0`,
  ];
  for (const sql of sqls) {
    await client.query(sql);
    console.log('OK:', sql.substring(0, 60));
  }
  console.log('Concluido!');
  await client.end();
}

run().catch(e => { console.error('Erro:', e.message); client.end(); });
