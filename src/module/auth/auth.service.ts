import { pool } from "../../DB";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { config } from "../../config/env";

const logingUserIntpDB = async (payload: {email: string, password: string}) => {
    const {email, password} = payload;

    //1: checking if user exist or not 

    const userExistOrNot = await pool.query(`
        SELECT * FROM users WHERE email = $1
        `, [email])
        
        if(userExistOrNot.rows.length === 0){
            throw new Error("Invalid credentials!!");
        }
        // console.log(userExistOrNot.rows[0]);

        //2: compare password:
        const matchPassword = await bcrypt.compare(password, userExistOrNot.rows[0].password);
        if(!matchPassword){
            throw new Error("Invalid credentials!!");
        }
        const user = userExistOrNot.rows[0];
        //generate jwt token: 
        const jwtPayload = {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
        }

        //3: generate accessToken:
        const token = jwt.sign(jwtPayload, config.accessToken as string, {expiresIn: "10d"});
        delete user.password;
        return {token, user};
        
}

export const authService = {
    logingUserIntpDB
}
