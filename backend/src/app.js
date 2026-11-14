import express from "express";
import cors from "cors";

import healthRoutes from "./routes/healthRoutes.js";
import dashboardRoutes from "./routes/dashboardRoutes.js";
import dataRoutes from "./routes/dataRoutes.js";
import customerRoutes from "./routes/customerRoutes.js";
import accountRoutes from "./routes/accountRoutes.js";

const app = express();

app.use(cors());
app.use(express.json());
app.use("/api/dashboard", dashboardRoutes);
app.use("/api", dataRoutes);
app.use("/api/customers", customerRoutes);
app.use("/api/accounts", accountRoutes);

app.use("/api/health", healthRoutes);

export default app;