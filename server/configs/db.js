import { neon } from "@neondatabase/serverless";

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error("❌ DATABASE_URL is missing from server/.env");
  process.exit(1);
}

const sql = neon(DATABASE_URL);

export const testDatabaseConnection = async () => {
  try {
    const result = await sql`
      SELECT
        current_database() AS database,
        current_schema() AS schema
    `;

    console.log("======================================");
    console.log("🟢 NEON DATABASE CONNECTED");
    console.log("Database:", result[0].database);
    console.log("Schema:", result[0].schema);

    const tables = await sql`
      SELECT table_schema, table_name
      FROM information_schema.tables
      WHERE table_name = 'creations'
    `;

    if (tables.length > 0) {
      console.log(
        "✅ Creations table found:",
        `${tables[0].table_schema}.${tables[0].table_name}`
      );
    } else {
      console.log("❌ Creations table NOT FOUND in this database");
    }

    console.log("======================================");
  } catch (error) {
    console.error("❌ Neon database connection failed:");
    console.error(error);
  }
};

export default sql;