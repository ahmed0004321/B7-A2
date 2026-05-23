import type { Response } from "express";
import type { send } from "node:process"

type TResponse <T>= {
    statusCode: number;
    messege: string;
    data?: T;
    error?: any
}

const sendResponse = <T>(res: Response, data: any) => {
res.status(data.statusCode).json({
      success: data.success,
      message: data.message,
      data: data.data,
      error: data.error
    });
}

export default sendResponse;