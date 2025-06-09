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

// Create a new conversation (requires auth)
router.post("/", authMiddleware, conversationController.createConversation);

// Get comments for a conversation
router.get(
  "/:id/comments",
  optionalAuthMiddleware,
  conversationController.getConversationComments
);

// Add a comment to a conversation (requires auth)
router.post("/:id/comments", authMiddleware, conversationController.addComment);

// Like a conversation (requires auth)
router.post(
  "/:id/like",
  authMiddleware,
  conversationController.likeConversation
);

// Unlike a conversation (requires auth)
router.post(
  "/:id/unlike",
  authMiddleware,
  conversationController.unlikeConversation
);

module.exports = router;
