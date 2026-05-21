import dotenv from "dotenv";
import path from "path";

dotenv.config({
    path: path.join(process.cwd(), ".env"),
})

export const config = {
    port: process.env.PORT,
    connectionString: process.env.CONNECTION_STRING,
    accessToken: process.env.ACCESS_TOKEN
}