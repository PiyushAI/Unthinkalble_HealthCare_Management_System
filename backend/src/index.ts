import "dotenv/config";
import express from "express";
import cors from "cors";
import { patientRouter } from "./routes/patientRoutes.js";
import { doctorRouter } from "./routes/doctorRoutes.js";
import { adminRouter } from "./routes/adminRoutes.js";
import { authRouter } from "./routes/authRoutes.js";
import { startBackgroundWorkers } from "./queues/worker.js";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => res.json({ status: "ok" }));

app.use(authRouter);
app.use(patientRouter);
app.use(doctorRouter);
app.use(adminRouter);

// Start medication reminder background runner
startBackgroundWorkers();

// Central error handler
app.use(
  (err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
);

const PORT = process.env.PORT ?? 4000;
app.listen(PORT, () => console.log(`API listening on port ${PORT}`));
