const Article = require("../models/article.model");
const User = require("../models/user.model");

// Get all published articles
exports.getPublishedArticles = async (req, res) => {
  try {
    const articles = await Article.find({ isPublished: true })
      .sort({ publishedAt: -1 })
      .populate("author", "username")
      .lean();

    res.status(200).json(articles);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get all articles (admin only)
exports.getAllArticles = async (req, res) => {
  try {
    // Check if user is admin
    const user = await User.findById(req.userId);
    if (!user.isAdmin) {
      return res.status(403).json({ message: "Access denied. Admin only." });
    }

    const articles = await Article.find()
      .sort({ createdAt: -1 })
      .populate("author", "username")
      .lean();

    res.status(200).json(articles);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Create a new article (admin only)
exports.createArticle = async (req, res) => {
  try {
    // Check if user is admin
    const user = await User.findById(req.userId);
    if (!user.isAdmin) {
      return res.status(403).json({ message: "Access denied. Admin only." });
    }

    const { title, content, excerpt, category, readTime, isPublished } =
      req.body;

    const article = new Article({
      title,
      content,
      excerpt,
      category,
      readTime,
      author: req.userId,
      isPublished,
      publishedAt: isPublished ? new Date() : null,
    });

    await article.save();

    res.status(201).json({
      message: "Article created successfully",
      article,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Update an article (admin only)
exports.updateArticle = async (req, res) => {
  try {
    // Check if user is admin
    const user = await User.findById(req.userId);
    if (!user.isAdmin) {
      return res.status(403).json({ message: "Access denied. Admin only." });
    }

    const { title, content, excerpt, category, readTime, isPublished } =
      req.body;
    const article = await Article.findById(req.params.id);

    if (!article) {
      return res.status(404).json({ message: "Article not found" });
    }

    article.title = title || article.title;
    article.content = content || article.content;
    article.excerpt = excerpt || article.excerpt;
    article.category = category || article.category;
    article.readTime = readTime || article.readTime;

    // Handle publishing status
    if (isPublished !== undefined) {
      article.isPublished = isPublished;
      article.publishedAt = isPublished ? new Date() : null;
    }

    await article.save();

    res.status(200).json({
      message: "Article updated successfully",
      article,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Delete an article (admin only)
exports.deleteArticle = async (req, res) => {
  try {
    // Check if user is admin
    const user = await User.findById(req.userId);
    if (!user.isAdmin) {
      return res.status(403).json({ message: "Access denied. Admin only." });
    }

    const article = await Article.findById(req.params.id);

    if (!article) {
      return res.status(404).json({ message: "Article not found" });
    }

    await article.remove();

    res.status(200).json({
      message: "Article deleted successfully",
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
