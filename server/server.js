const dotenv = require("dotenv");

dotenv.config();

const express = require("express");
const cors = require("cors");

const connectDB = require("./db");
const adminRoutes = require("./routes/admin");
const authRoutes = require("./routes/auth");
const bookmarkRoutes = require("./routes/bookmarks");
const branchRoutes = require("./routes/branches");
const conceptRoutes = require("./routes/concepts");
const homeRoutes = require("./routes/home");
const moduleRoutes = require("./routes/modules");
const noteRoutes = require("./routes/notes");
const notificationRoutes = require("./routes/notifications");
const paymentRoutes = require("./routes/payment");
const questionRoutes = require("./routes/questions");
const reportRoutes = require("./routes/reports");
const searchRoutes = require("./routes/search");
const semesterRoutes = require("./routes/semesters");
const subjectRoutes = require("./routes/subjects");
const topicRoutes = require("./routes/topics");
require("./models/User");
require("./models/Branch");
require("./models/Semester");
require("./models/Subject");
require("./models/Module");
require("./models/Topic");
require("./models/Question");
require("./models/Concept");
require("./models/Note");
require("./models/Bookmark");
require("./models/Report");
require("./models/PushToken");
require("./models/PaymentOrder");
require("./models/Notification");
require("./models/UserNotification");

const app = express();
const PORT = Number(process.env.PORT) || 5001;
const HOST = "0.0.0.0";

app.use(cors());
app.use("/api/payment/webhook", express.raw({ type: "application/json" }));
app.use(express.json());

app.use("/api/admin", adminRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/bookmarks", bookmarkRoutes);
app.use("/api/branches", branchRoutes);
app.use("/api/concepts", conceptRoutes);
app.use("/api/home", homeRoutes);
app.use("/api/modules", moduleRoutes);
app.use("/api/notes", noteRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/payment", paymentRoutes);
app.use("/api/questions", questionRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/search", searchRoutes);
app.use("/api/semesters", semesterRoutes);
app.use("/api/subjects", subjectRoutes);
app.use("/api/topics", topicRoutes);

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

const startServer = async () => {
  try {
    if (process.env.MONGO_URI) {
      await connectDB();
    } else {
      console.warn("MONGO_URI is not set. Skipping MongoDB connection.");
    }

    return app.listen(PORT, HOST, () => {
      console.log(`Server running on ${HOST}:${PORT}`);
    });
  } catch (error) {
    console.error("Server startup failed", error);
    process.exit(1);
  }
};

if (require.main === module) {
  startServer();
}

module.exports = { app, startServer };
