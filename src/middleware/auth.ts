import type { NextFunction, Request, Response } from "express";
import type { ROLES } from "../types";
import jwt, { type JwtPayload } from "jsonwebtoken"
import { config } from "../config/env";
import { pool } from "../DB";

const auth = (...roles: ROLES[]) => {
  console.log(roles);

  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const token = req.headers.authorization;
      console.log(token);
      if (!token) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized access!!",
        });
      }

      const decoded = jwt.verify(
    token as string,
    config.accessToken as string,
) as { id: number; name: string; email: string; role: string };

      const userData = await pool.query(
        `
        SELECT * FROM users WHERE email = $1
        `,
        [decoded.email],
      );
      console.log(userData);

      const user = userData.rows[0];
      if (userData.rows.length === 0) {
        return res.status(401).json({
          success: false,
          message: "User not found!!",
        });
      }

      if(roles.length && !roles.includes(user.role)){
        return res.status(403).json({
          success: false,
          message: "Forbidden!! this role have no access",
        });
      }

       req.user = { ...decoded, id: user.id };
console.log("req.user set to:", req.user);

      next();
    } catch (error) {
      next(error);
    }
  };
};

export default auth;
