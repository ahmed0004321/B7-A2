import { pool } from "../../DB";
import type { Iissues } from "./issues.interface";

const insertIssueIntoDB = async (payload: Iissues, reporter_id: number) => {
  const { title, description, type } = payload;

  const result = await pool.query(
    `
        INSERT INTO issues(title, description, type, reporter_id) VALUES($1, $2, $3, $4)
        RETURNING *
        `,
    [title, description, type, reporter_id],
  );

  return result;
};

const getAllUserFromDB = async () => {
  const issues = await pool.query(`SELECT * FROM issues`);

  const reporterIds = [...new Set(issues.rows.map((i) => i.reporter_id))];

  const users = await pool.query(
    `SELECT id, name, role FROM users WHERE id = ANY($1)`,
    [reporterIds],
  );

  const userMap = Object.fromEntries(users.rows.map((u) => [u.id, u]));

  return issues.rows.map((issue) => ({
    ...issue,
    reporter: userMap[issue.reporter_id],
  }));
};

const getSingleIssueFromDB = async (id: string) => {
  const result = await pool.query(
    `
        SELECT * FROM issues WHERE id = $1
    `,
    [id],
  );

  if (result.rows.length === 0) return null;

  const issue = result.rows[0];

  const user = await pool.query(
    `SELECT id, name, role FROM users WHERE id = $1`,
    [issue.reporter_id],
  );

  return {
    ...issue,
    reporter: user.rows[0],
  };
};


const deleteIssueFromDB = async (id: string) => {
    const result = await pool.query(
        `SELECT * FROM issues WHERE id = $1`, [id]
    );

    if (result.rows.length === 0) return null;

    await pool.query(
        `DELETE FROM issues WHERE id = $1`, [id]
    );

    return result;
};

export const issueService = {
  insertIssueIntoDB,
  getAllUserFromDB,
  getSingleIssueFromDB,
  deleteIssueFromDB
};
