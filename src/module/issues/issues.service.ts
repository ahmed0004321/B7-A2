import type { JwtPayload } from "jsonwebtoken";
import { pool } from "../../DB";
import { USER_ROLE } from "../../types";
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


const updateIssueFromDB = async (
    id: string, 
    payload: Partial<Iissues>, 
    user: (JwtPayload & { id: number; role: string }) | undefined 
) => {

  // console.log("logged in id=",id, "update details=",payload, "middleware id",user);
  
    if (!user) throw new Error('Unauthorized');

    const issueResult = await pool.query(
        `SELECT * FROM issues WHERE id = $1`, [id]
    );

    if (issueResult.rows.length === 0) return null;

    const issue = issueResult.rows[0];

    console.log("issue.reporter_id:", issue.reporter_id, typeof issue.reporter_id);
console.log("user.id:", user.id, typeof user.id);
console.log("match:", issue.reporter_id === user.id);

    if (user.role === USER_ROLE.contributor) {
        if (issue.reporter_id !== user.id) {
            throw new Error('You can only update your own issues');
        }
        if (issue.status !== 'open') {
            throw new Error('You can only update issues with open status');
        }
    }

    const { title, description, type } = payload;

    const result = await pool.query(`
        UPDATE issues 
        SET 
            title = COALESCE($1, title),
            description = COALESCE($2, description),
            type = COALESCE($3, type),
            updated_at = NOW()
        WHERE id = $4
        RETURNING *
    `, [title, description, type, id]);

    return result.rows[0];
};

export const issueService = {
  insertIssueIntoDB,
  getAllUserFromDB,
  getSingleIssueFromDB,
  deleteIssueFromDB,
  updateIssueFromDB
};
