import type { Request, Response } from "express";
import { issueService } from "./issues.service";

const createIssue = async (req: Request, res: Response) => {
  console.log("Headers:", req.headers);
  console.log("Body:", req.body);

  const id = Number(req.user?.id);

  const result = await issueService.insertIssueIntoDB(req.body, id);
  res.status(201).json({
    success: true,
    messege: "Issue created successfully",
    data: result.rows[0],
  });
};

const getAllIssue = async (req: Request, res: Response) => {
  const result = await issueService.getAllUserFromDB();
  res.status(200).json({
    success: true,
    message: "Issues fetched successfully",
    data: result,
  });
};

const getSingleIssue = async (req: Request, res: Response) => {
  const id = req.params.id;
  try {
    const result = await issueService.getSingleIssueFromDB(id as string);
    if (!result) {
      return res.status(404).json({
        success: false,
        message: "Issue not found!",
      });
    }

    res.status(200).json({
      success: true,
      message: "Issue retrieved successfully!",
      data: result,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message,
      error: error,
    });
  }
};


const updateIssue = async (req: Request, res: Response) => {
    const id = req.user;
    const result = await issueService.updateIssueFromDB(req.body, id);
}

export const issueController = {
  createIssue,
  getAllIssue,
  getSingleIssue,
  updateIssue
};
