import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import dotenv from "dotenv";
dotenv.config();

// Create a PostgreSQL client
const client = new pg.Client({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DATABASE,
});

// Connect to the PostgreSQL database
async function connectToDatabase() {
  try {
    await client.connect();
    console.log("Db connected successfully");
  } catch (err) {
    console.error("Failed to connect to the database", err);
    process.exit(1); // Exit the process with an error code if connection fails
  }
}

connectToDatabase();

// Initialize Drizzle with the client
const db = drizzle(client);

export default db;
