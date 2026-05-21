import { Pool } from "pg";
import { config } from "../config/env";

export const pool = new Pool({
  connectionString: config.connectionString,
});

export const initDB = async () => {
  try {
    await pool.query(`
            CREATE TABLE IF NOT EXISTS users(
            id SERIAL PRIMARY KEY,
            name VARCHAR(50),
            email VARCHAR(50),
            password TEXT NOT NULL,
            role VARCHAR(40) DEFAULT 'contributor',

            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
            )
            `)

    await pool.query(`
                CREATE TABLE IF NOT EXISTS issues (
                id SERIAL PRIMARY KEY,
                title VARCHAR(150) NOT NULL,
                description TEXT NOT NULL
                CHECK (LENGTH(description) >= 20),

                type VARCHAR(20) NOT NULL
                CHECK (type IN ('bug', 'feature_request')),

                status VARCHAR(20) NOT NULL DEFAULT 'open'
                CHECK (status IN ('open', 'in_progress', 'resolved')),

                reporter_id INT NOT NULL,

                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
);
                `);

    console.log("Database Connected Successfully!");
  } catch (error) {
    console.log(error);
  }
};
