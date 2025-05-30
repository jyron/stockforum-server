const express = require("express");
const router = express.Router();
const stockController = require("../controllers/stock.controller");
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
      // This allows anonymous interactions
    }
  }

  next();
};

// Public routes
router.get("/", stockController.getAllStocks);
router.get("/symbol/:symbol", stockController.getStockBySymbol); // New endpoint for symbol lookup
router.get("/:id", stockController.getStockById);

// Protected routes
router.post("/", authMiddleware, stockController.createStock);
router.put("/:id", authMiddleware, stockController.updateStock);
router.delete("/:id", authMiddleware, stockController.deleteStock);

// Like/dislike routes (public, but with optional auth to track user interactions)
router.post("/:id/like", optionalAuthMiddleware, stockController.likeStock);
router.post(
  "/:id/dislike",
  optionalAuthMiddleware,
  stockController.dislikeStock
);

module.exports = router;
