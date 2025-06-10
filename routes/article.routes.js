const express = require("express");
const router = express.Router();
const articleController = require("../controllers/article.controller");
const authMiddleware = require("../middleware/auth.middleware");

// Public routes
router.get("/all", articleController.getAllArticles);
router.get("/:id", articleController.getArticleById);

// Protected routes (admin only)
router.get("/admin/all", authMiddleware, articleController.getAllArticlesAdmin);
router.post("/", authMiddleware, articleController.createArticle);
router.put("/:id", authMiddleware, articleController.updateArticle);
router.delete("/:id", authMiddleware, articleController.deleteArticle);

module.exports = router;
