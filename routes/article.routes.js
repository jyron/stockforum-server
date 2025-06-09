const express = require("express");
const router = express.Router();
const articleController = require("../controllers/article.controller");
const authMiddleware = require("../middleware/auth.middleware");

// Public routes
router.get("/published", articleController.getPublishedArticles);

// Admin routes (protected)
router.get("/all", authMiddleware, articleController.getAllArticles);
router.post("/", authMiddleware, articleController.createArticle);
router.put("/:id", authMiddleware, articleController.updateArticle);
router.delete("/:id", authMiddleware, articleController.deleteArticle);

module.exports = router;
