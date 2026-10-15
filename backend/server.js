require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const compression = require("compression");

const app = express();
const MONGO_URI = process.env.MONGO_URI;
let dbConnectionPromise;

// Middleware
app.use(compression({ threshold: 1024 }));
app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use("/api", (req, res, next) => {
  // User-scoped API data must never be stored by a shared cache. Keep ETag
  // revalidation enabled so unchanged responses can still return a small 304.
  res.setHeader("Cache-Control", "private, no-cache, must-revalidate");
  next();
});

// Vercel reuses this Express app as a function, so connect on demand and reuse
// the Mongo connection across warm invocations. Local startup connects before
// listening, while this middleware also covers cold serverless invocations.
app.use(async (_req, _res, next) => {
  if (mongoose.connection.readyState === 1) return next();
  if (!MONGO_URI) return next(new Error("MONGO_URI is required"));

  try {
    if (mongoose.connection.readyState === 0 || !dbConnectionPromise) {
      dbConnectionPromise = mongoose.connect(MONGO_URI).catch((error) => {
        dbConnectionPromise = undefined;
        throw error;
      });
    }
    await dbConnectionPromise;
    return next();
  } catch (error) {
    return next(error);
  }
});

// Routes
app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/dashboard", require("./routes/dashboardRoutes"));
app.use("/api/teams", require("./routes/teamRoutes"));
app.use("/api/scoring-rules", require("./routes/scoringRuleRoutes"));
app.use("/api/events", require("./routes/eventRoutes"));
app.use("/api/exports", require("./routes/exportRoutes"));
app.use("/api/matches", require("./routes/matchRoutes"));
app.use("/api/audit-logs", require("./routes/auditLogRoutes"));
app.use("/api/catalog", require("./routes/catalogRoutes"));
app.use("/api/templates", require("./routes/templateRoutes"));
app.use("/api/support", require("./routes/supportRoutes"));
app.use("/api/admin", require("./routes/adminRoutes"));

// Basic Route
app.get("/", (req, res) => {
  res.send("Esports Tournament Backend API is running!");
});

// Global Error Handler (converts all backend exceptions to JSON)
app.use((err, req, res, next) => {
  console.error("Unhandled API Error:", err);
  const status = err.status || err.statusCode || 500;
  res.status(status).json({
    message: err.message || "An unexpected server error occurred",
  });
});

// Database Connection
module.exports = app;

if (require.main === module) {
  const PORT = process.env.PORT || 5000;
  const localMongoUri = MONGO_URI || "mongodb://localhost:27017/esports_tool";

  mongoose
    .connect(localMongoUri)
    .then(() => {
      console.log("Connected to MongoDB");
      app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
    })
    .catch((err) => {
      console.error("MongoDB connection error:", err);
    });
}
