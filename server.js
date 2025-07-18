/**
 * Stock Forum Server
 *
 * Main server file that initializes Express application,
 * sets up middleware, connects to MongoDB, and defines API routes.
 */

require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const morgan = require("morgan");
const axios = require("axios");
const passport = require("passport");

// Import routes
const authRoutes = require("./routes/auth.routes");
const stockRoutes = require("./routes/stock.routes");
const commentRoutes = require("./routes/comment.routes");
const conversationRoutes = require("./routes/conversation.routes");
const articleRoutes = require("./routes/article.routes");
const portfolioRoutes = require("./routes/portfolio.routes");
const sitemapRouter = require("./routes/sitemap");

// Import Passport config
require("./config/passport");

// Initialize express app
const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(
  cors({
    origin:
      process.env.NODE_ENV === "production"
        ? ["https://stock-forum.netlify.app", "https://stockforum.io"]
        : ["http://localhost:3000"],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.use(express.json());
app.use(morgan("dev"));
app.use(passport.initialize());

// Routes
app.use("/", sitemapRouter);
app.use("/api/auth", authRoutes);
app.use("/api/stocks", stockRoutes);
app.use("/api/comments", commentRoutes);
app.use("/api/conversations", conversationRoutes);
app.use("/api/articles", articleRoutes);
app.use("/api/portfolios", portfolioRoutes);

// MongoDB connection
mongoose
  .connect(process.env.MONGODB_URI || "mongodb://localhost:27017/stock-forum", {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() =>
    console.log("MongoDB connected successfully: ", process.env.MONGODB_URI)
  )
  .catch((err) => console.error("MongoDB connection error:", err));

// Basic route
app.get("/", (req, res) => {
  res.send("Stock Forum API is running");
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
