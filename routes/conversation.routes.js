const router = require("express").Router();
const conversationController = require("../controllers/conversation.controller");
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
      req.userId = decoded.id;
    } catch (error) {
      // Token is invalid, but we continue without setting userId
    }
  }

  next();
};

// Get all conversations
router.get(
  "/",
  optionalAuthMiddleware,
  conversationController.getAllConversations
);

// Get a single conversation
router.get(
  "/:id",
  optionalAuthMiddleware,
  conversationController.getConversation
);

// Get comments for a conversation
router.get("/:id/comments", conversationController.getConversationComments);

// Create a new conversation
router.post(
  "/",
  optionalAuthMiddleware,
  conversationController.createConversation
);

// Add a comment to a conversation
router.post(
  "/:id/comments",
  optionalAuthMiddleware,
  conversationController.addComment
);

// Like a conversation
router.post(
  "/:id/like",
  optionalAuthMiddleware,
  conversationController.likeConversation
);

// Unlike a conversation
router.post(
  "/:id/unlike",
  optionalAuthMiddleware,
  conversationController.unlikeConversation
);

module.exports = router;
