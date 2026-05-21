import { error } from "node:console";
import { pool } from "../../DB";
import type { Iuser } from "./user.interface";
import bcrypt from "bcrypt";

const createUserIntoDB = async (payload: Iuser) => {
    const {name, email, password, role} = payload;
    console.log(payload);

    const hashPassword = await bcrypt.hash(password, 10);

    const existOrNot = await pool.query(`
        SELECT id FROM users WHERE email = $1
        `, [email])
        if(existOrNot.rows.length > 0){
            throw new Error("User already exist in the DB");
        }
    const result = await pool.query(`
        INSERT INTO users(name, email, password, role) VALUES($1, $2, $3, $4)
        RETURNING *
        `, [name, email, hashPassword, role || "contributor"])

        delete result.rows[0].password;

        if(result.rows.length === 0){
             throw new Error("User not found!");
        } 
        return result;
}

export const userService = {
    createUserIntoDB
}