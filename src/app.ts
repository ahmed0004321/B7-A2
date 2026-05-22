import express, {
  type Application,
  type Request,
  type Response,
} from "express";
import { userRoute } from "./module/user/user.route";
import { authRoute } from "./module/auth/auth.route";
import { issuesRoute } from "./module/issues/issues.route";

const app: Application = express();

app.use(express.json());
app.use(express.text());
app.use(express.urlencoded({ extended: true }));

app.get("/", (req: Request, res: Response) => {
  // res.send('Hello World!')
  res.status(200).json({
    massage: "Express server",
    author: "next level",
  });
});

app.use("/api/auth/signup", userRoute);

app.use("/api/auth/login", authRoute);

app.use("/api/issues", issuesRoute);

app.use("/api/allIssues", issuesRoute);

app.use('/api/issue', issuesRoute);

app.use('/api/issue', issuesRoute);

app.use('/api/issue', issuesRoute);

export default app;
