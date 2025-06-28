const express = require("express");
const router = express.Router();
const portfolioController = require("../controllers/portfolio.controller");
const authMiddleware = require("../middleware/auth.middleware");
const { uploadMiddleware } = require("../middleware/upload.middleware");

// Optional auth middleware - sets req.userId if token is valid, but doesn't require it
const optionalAuthMiddleware = (req, res, next) => {
  const token = req.header("Authorization")?.replace("Bearer ", "");

  if (token) {
    try {
      const jwt = require("jsonwebtoken");
      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || "your-secret-key"
      );
      req.userId = decoded.id; // Use 'id' not 'userId' to match the JWT payload
    } catch (error) {
      // Token is invalid, but we continue without setting userId
      // This allows anonymous interactions
    }
  }

  next();
};

// File upload endpoint (protected - requires authentication)
router.post(
  "/upload",
  authMiddleware,
  uploadMiddleware,
  portfolioController.createPortfolio
);

// Public routes
router.get("/", portfolioController.getAllPortfolios);
router.get("/:id", portfolioController.getPortfolioById);

// Protected routes (require authentication)
router.post(
  "/",
  authMiddleware,
  uploadMiddleware,
  portfolioController.createPortfolio
);
router.delete("/:id", authMiddleware, portfolioController.deletePortfolio);

// Voting routes (public, supports anonymous voting)
router.post(
  "/:id/vote",
  optionalAuthMiddleware,
  portfolioController.votePortfolio
);
router.delete(
  "/:id/vote",
  optionalAuthMiddleware,
  portfolioController.removeVote
);

// Comment routes (follow comment.routes.js patterns)
// Get comments for a portfolio (public)
router.get("/:id/comments", portfolioController.getPortfolioComments);

// Create comment (public, supports anonymous)
router.post(
  "/:id/comments",
  optionalAuthMiddleware,
  portfolioController.createPortfolioComment
);

module.exports = router;
