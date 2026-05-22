import type { Request, Response } from "express";
import { issueService } from "./issues.service";
import { USER_ROLE } from "../../types";
import { pool } from "../../DB";
import type { Iissues } from "./issues.interface";

const createIssue = async (req: Request, res: Response) => {
  try {
    const id = Number(req.user?.id);

    const result = await issueService.insertIssueIntoDB(req.body, id);
    
    res.status(201).json({
      success: true,
      message: "Issue created successfully",
      data: result.rows[0],
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const getAllIssue = async (req: Request, res: Response) => {
  try {
    const { sort, type, status } = req.query;

    const result = await issueService.getAllIssueFromDB(
      sort as string,
      type as string,
      status as string,
    );

    res.status(200).json({
      success: true,
      message: "Issues fetched successfully",
      data: result,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
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

const deleteIssue = async (req: Request, res: Response) => {
  try {
    const id = req.params.id;

    const result = await issueService.deleteIssueFromDB(id as string);

    if (!result) {
      return res.status(404).json({
        success: false,
        message: "Issue not found!",
      });
    }

    res.status(200).json({
      success: true,
      message: "Issue deleted successfully",
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const canUpdateIssue = (
  issue: Iissues, 
  user: { id: number; name: string; email: string; role: string }
): boolean => {
  if (user.role === USER_ROLE.maintainer) {
    return true;
  }
  // Convert reporter_id to a number for safe comparison, since PG returns it as a number
  return (Number(issue.reporter_id) === user.id && issue.status === "open");
};

const updateIssue = async (req: Request, res: Response) => {

  try {
    const id = req.params.id; // issue ID
    const user = req.user; // user decoded from jwt token

    // Check if user is logged in
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized access!",
      });
    }

    const issueResult = await pool.query(
          `SELECT * FROM issues WHERE id = $1`, [id]
      );
  
      if (issueResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Issue not found!",
      });
    }
      const issue = issueResult.rows[0];

    // user is now guaranteed to be defined and matched with the correct type
    if (!canUpdateIssue(issue, user)) {
      return res.status(403).json({
        success: false,
        message: "access denied.", // fixed typo "messege" if desired
      });
    }

    const result = await issueService.updateIssueFromDB(
      id as string,
      req.body,
      user
    );

    if (!result) {
      return res.status(500).json({
        success: false,
        message: "Something went wrong!",
      });
    }

    res.status(200).json({
      success: true,
      message: "Issue updated successfully",
      data: result,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


export const issueController = {
  createIssue,
  getAllIssue,
  getSingleIssue,
  deleteIssue,
  updateIssue,
};
