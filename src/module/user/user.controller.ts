import type { Request, Response } from "express";
import { userService } from "./user.service";

const signUpNewUser = async (req: Request, res: Response) => {
  try {
    const result = await userService.createUserIntoDB(req.body);
    res.status(201).json({
        success: true,
      message: "User registered successfully",
      data: result.rows[0],
    });
  } catch (error: any) {
    res.status(500).json({
        success: false,
      message: error.message,
      error: error,
    });
  }
};

export const userController = {
  signUpNewUser,
};
