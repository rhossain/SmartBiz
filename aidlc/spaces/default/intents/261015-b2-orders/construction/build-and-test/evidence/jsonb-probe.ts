import postgres from "postgres";
const sql = postgres(process.argv[2]!, { max: 1, prepare: false });
const o = { a: 1 };
const r = await sql`SELECT jsonb_typeof(${JSON.stringify(o)}::jsonb) AS str_cast, jsonb_typeof(${sql.json(o)}) AS sql_json, jsonb_typeof(${JSON.stringify(o)}::text::jsonb) AS text_cast`;
console.log(r[0]); await sql.end();
