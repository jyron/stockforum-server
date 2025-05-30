const express = require("express");
const router = express.Router();
const commentController = require("../controllers/comment.controller");
const authMiddleware = require("../middleware/auth.middleware");

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
      // This allows anonymous commenting
    }
  }

  next();
};

// Get all comments for a stock (public)
router.get("/stock/:stockId", commentController.getStockComments);

// Create comment (public, supports anonymous)
router.post("/", optionalAuthMiddleware, commentController.createComment);

// Protected routes (require authentication)
router.put("/:id", authMiddleware, commentController.updateComment);
router.delete("/:id", authMiddleware, commentController.deleteComment);

// Like/dislike routes (public, supports anonymous)
router.post("/:id/like", optionalAuthMiddleware, commentController.likeComment);
router.post(
  "/:id/dislike",
  optionalAuthMiddleware,
  commentController.dislikeComment
);

module.exports = router;
