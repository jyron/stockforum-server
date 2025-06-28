/**
 * Portfolio Controller
 *
 * Handles all portfolio-related operations including CRUD operations,
 * file upload processing, and integration with S3 cloud storage.
 */

const PortfolioPost = require("../models/portfolioPost.model");
const PortfolioVote = require("../models/portfolioVote.model");
const PortfolioComment = require("../models/portfolioComment.model");
const {
  uploadToS3,
  deleteFromS3,
  generateUniqueFileName,
} = require("../utils/s3Upload");
const { processPortfolioImage } = require("../utils/imageProcessor");
const mongoose = require("mongoose");

/**
 * Get all portfolios
 *
 * @param {Object} req - Express request object with optional query parameters
 * @param {Object} res - Express response object
 * @returns {Array} - List of portfolios with filtering and sorting
 */
exports.getAllPortfolios = async (req, res) => {
  try {
    const { category, sort = "hot", page = 1, limit = 20 } = req.query;
    console.log("Portfolio query received:", { category, sort, page, limit });

    let query = { isApproved: true }; // Only show approved portfolios

    // Filter by category if provided
    if (category && category !== "all") {
      query.category = category.toUpperCase();
    }

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Build sort criteria
    let sortCriteria = {};
    switch (sort) {
      case "hot":
        // Sort by engagement (upvotes + comments)
        sortCriteria = { upvotes: -1, commentCount: -1, createdAt: -1 };
        break;
      case "new":
        sortCriteria = { createdAt: -1 };
        break;
      case "top":
        sortCriteria = { upvotes: -1 };
        break;
      case "controversial":
        // Simple controversial sorting (high downvotes + upvotes)
        sortCriteria = { downvotes: -1, upvotes: -1 };
        break;
      default:
        sortCriteria = { createdAt: -1 };
    }

    const portfolios = await PortfolioPost.find(query)
      .sort(sortCriteria)
      .skip(skip)
      .limit(parseInt(limit))
      .populate("author", "username")
      .lean();

    // Add vote calculations for each portfolio
    const portfoliosWithVotes = portfolios.map((portfolio) => ({
      ...portfolio,
      netVotes: portfolio.upvotes - portfolio.downvotes,
    }));

    // Get total count for pagination
    const totalCount = await PortfolioPost.countDocuments(query);

    res.status(200).json({
      portfolios: portfoliosWithVotes,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalCount / parseInt(limit)),
        totalCount,
        hasNextPage: skip + portfolios.length < totalCount,
      },
    });
  } catch (error) {
    console.error("Error in getAllPortfolios:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

/**
 * Get a single portfolio by ID
 *
 * @param {Object} req - Express request object with portfolio ID in params
 * @param {Object} res - Express response object
 * @returns {Object} - Portfolio details with comments
 */
exports.getPortfolioById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid portfolio ID format" });
    }

    const portfolio = await PortfolioPost.findById(id)
      .populate("author", "username")
      .lean();

    if (!portfolio) {
      return res.status(404).json({ message: "Portfolio not found" });
    }

    // Add net votes calculation
    portfolio.netVotes = portfolio.upvotes - portfolio.downvotes;

    res.status(200).json(portfolio);
  } catch (error) {
    console.error("Error in getPortfolioById:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

/**
 * Create a new portfolio
 *
 * @param {Object} req - Express request object with portfolio data and file
 * @param {Object} res - Express response object
 * @returns {Object} - Created portfolio details
 */
exports.createPortfolio = async (req, res) => {
  try {
    const { title, description, performance, category = "OTHER" } = req.body;
    const userId = req.userId;

    // Validate required fields
    if (!title || !title.trim()) {
      return res.status(400).json({
        success: false,
        message: "Portfolio title is required",
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Portfolio image is required",
      });
    }

    // Process the uploaded image
    const processedImages = await processPortfolioImage(req.file.buffer, {
      generateThumb: true,
      optimize: true,
      convertTo: "jpeg",
    });

    // Generate unique filenames
    const mainImageName = generateUniqueFileName(req.file.originalname);
    const thumbnailName = generateUniqueFileName(
      `thumb_${req.file.originalname}`
    );

    // Upload both images to S3
    const [mainImageUpload, thumbnailUpload] = await Promise.all([
      uploadToS3(processedImages.originalImage, mainImageName, "image/jpeg"),
      uploadToS3(processedImages.thumbnail, thumbnailName, "image/jpeg"),
    ]);

    // Create portfolio post in database
    const portfolio = new PortfolioPost({
      title: title.trim(),
      description: description ? description.trim() : "",
      performance: performance ? performance.trim() : "",
      category: category.toUpperCase(),
      author: userId,
      imageUrl: mainImageUpload.url,
      thumbnailUrl: thumbnailUpload.url,
    });

    await portfolio.save();
    await portfolio.populate("author", "username");

    res.status(201).json({
      success: true,
      data: portfolio,
      message: "Portfolio created successfully",
    });
  } catch (error) {
    console.error("Error creating portfolio:", error);

    // Clean up uploaded files if database save fails
    // This is a best-effort cleanup
    try {
      if (req.uploadedImages) {
        await Promise.all([
          deleteFromS3(req.uploadedImages.main),
          deleteFromS3(req.uploadedImages.thumbnail),
        ]);
      }
    } catch (cleanupError) {
      console.error("Error cleaning up uploaded files:", cleanupError);
    }

    res.status(500).json({
      success: false,
      message: "Failed to create portfolio",
      error: error.message,
    });
  }
};

/**
 * Delete a portfolio
 *
 * @param {Object} req - Express request object with portfolio ID
 * @param {Object} res - Express response object
 * @returns {Object} - Success message
 */
exports.deletePortfolio = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid portfolio ID format" });
    }

    const portfolio = await PortfolioPost.findById(id);
    if (!portfolio) {
      return res.status(404).json({
        success: false,
        message: "Portfolio not found",
      });
    }

    // Check if user is authorized to delete (only the author can delete)
    if (portfolio.author.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to delete this portfolio",
      });
    }

    // Extract S3 keys from URLs for cleanup
    const getS3KeyFromUrl = (url) => {
      if (!url) return null;
      const urlParts = url.split("/");
      return urlParts[urlParts.length - 1];
    };

    const mainImageKey = getS3KeyFromUrl(portfolio.imageUrl);
    const thumbnailKey = getS3KeyFromUrl(portfolio.thumbnailUrl);

    // Delete the portfolio from database
    await portfolio.deleteOne();

    // Delete associated votes and comments
    await Promise.all([
      PortfolioVote.deleteMany({ portfolio: id }),
      PortfolioComment.deleteMany({ portfolio: id }),
    ]);

    // Clean up S3 files (best effort)
    try {
      const deletePromises = [];
      if (mainImageKey) deletePromises.push(deleteFromS3(mainImageKey));
      if (thumbnailKey) deletePromises.push(deleteFromS3(thumbnailKey));

      if (deletePromises.length > 0) {
        await Promise.all(deletePromises);
      }
    } catch (s3Error) {
      console.error("Error cleaning up S3 files:", s3Error);
      // Continue even if S3 cleanup fails
    }

    res.status(200).json({
      success: true,
      message: "Portfolio deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting portfolio:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete portfolio",
      error: error.message,
    });
  }
};

/**
 * Vote on a portfolio (upvote/downvote)
 *
 * @param {Object} req - Express request object with portfolio ID and vote type
 * @param {Object} res - Express response object
 * @returns {Object} - Updated vote counts
 */
exports.votePortfolio = async (req, res) => {
  try {
    const { id } = req.params;
    const { voteType } = req.body; // 'upvote' or 'downvote'
    const userId = req.userId;

    console.log("Vote portfolio request received:", {
      portfolioId: id,
      voteType,
      userId,
      hasAuth: !!req.header("Authorization"),
      ip: req.ip,
    });

    // Validate vote type
    if (!voteType || !["upvote", "downvote"].includes(voteType)) {
      return res.status(400).json({
        success: false,
        message: "Invalid vote type. Must be 'upvote' or 'downvote'",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid portfolio ID format",
      });
    }

    const portfolio = await PortfolioPost.findById(id);
    if (!portfolio) {
      return res.status(404).json({
        success: false,
        message: "Portfolio not found",
      });
    }

    // Get client identifier for anonymous voting
    const clientIdentifier = req.ip || "anonymous";
    const userAgent = req.get("User-Agent") || "";

    // Check for existing vote
    let existingVote;
    if (userId) {
      // Check for authenticated user vote
      existingVote = await PortfolioVote.findOne({
        portfolio: id,
        user: userId,
      });
    } else {
      // Check for anonymous vote by IP
      existingVote = await PortfolioVote.findOne({
        portfolio: id,
        ipAddress: clientIdentifier,
        user: { $exists: false },
      });
    }

    // If user already voted with the same type
    if (existingVote && existingVote.voteType === voteType) {
      return res.status(400).json({
        success: false,
        message: `You already ${voteType}d this portfolio`,
      });
    }

    // If switching vote type, remove old vote and update counts
    if (existingVote && existingVote.voteType !== voteType) {
      await existingVote.deleteOne();

      // Update portfolio counts (remove old vote)
      if (existingVote.voteType === "upvote") {
        portfolio.upvotes = Math.max(0, portfolio.upvotes - 1);
      } else {
        portfolio.downvotes = Math.max(0, portfolio.downvotes - 1);
      }
    }

    // Create new vote
    const newVote = new PortfolioVote({
      portfolio: id,
      user: userId || undefined,
      voteType,
      ipAddress: userId ? undefined : clientIdentifier,
      userAgent: userId ? undefined : userAgent,
    });

    await newVote.save();

    // Update portfolio vote counts
    if (voteType === "upvote") {
      portfolio.upvotes += 1;
    } else {
      portfolio.downvotes += 1;
    }

    await portfolio.save();

    res.status(200).json({
      success: true,
      message: `Portfolio ${voteType}d successfully`,
      data: {
        upvotes: portfolio.upvotes,
        downvotes: portfolio.downvotes,
        netVotes: portfolio.upvotes - portfolio.downvotes,
        userVote: voteType,
      },
    });
  } catch (error) {
    console.error("Error voting on portfolio:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

/**
 * Remove vote from a portfolio
 *
 * @param {Object} req - Express request object with portfolio ID
 * @param {Object} res - Express response object
 * @returns {Object} - Updated vote counts
 */
exports.removeVote = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    console.log("Remove vote request received:", {
      portfolioId: id,
      userId,
      hasAuth: !!req.header("Authorization"),
      ip: req.ip,
    });

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid portfolio ID format",
      });
    }

    const portfolio = await PortfolioPost.findById(id);
    if (!portfolio) {
      return res.status(404).json({
        success: false,
        message: "Portfolio not found",
      });
    }

    // Get client identifier for anonymous voting
    const clientIdentifier = req.ip || "anonymous";

    // Find existing vote
    let existingVote;
    if (userId) {
      existingVote = await PortfolioVote.findOne({
        portfolio: id,
        user: userId,
      });
    } else {
      existingVote = await PortfolioVote.findOne({
        portfolio: id,
        ipAddress: clientIdentifier,
        user: { $exists: false },
      });
    }

    if (!existingVote) {
      return res.status(400).json({
        success: false,
        message: "No existing vote found to remove",
      });
    }

    // Remove vote from database
    const removedVoteType = existingVote.voteType;
    await existingVote.deleteOne();

    // Update portfolio vote counts
    if (removedVoteType === "upvote") {
      portfolio.upvotes = Math.max(0, portfolio.upvotes - 1);
    } else {
      portfolio.downvotes = Math.max(0, portfolio.downvotes - 1);
    }

    await portfolio.save();

    res.status(200).json({
      success: true,
      message: "Vote removed successfully",
      data: {
        upvotes: portfolio.upvotes,
        downvotes: portfolio.downvotes,
        netVotes: portfolio.upvotes - portfolio.downvotes,
        userVote: null,
      },
    });
  } catch (error) {
    console.error("Error removing vote from portfolio:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

/**
 * Get all comments for a portfolio
 *
 * Retrieves top-level comments (not replies) for a specific portfolio,
 * with populated author information and nested replies.
 *
 * @param {Object} req - Express request object with portfolio ID parameter
 * @param {Object} res - Express response object
 * @returns {Array} - List of comments with their replies
 */
exports.getPortfolioComments = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate MongoDB ObjectId format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid portfolio ID format" });
    }

    // Find the portfolio by MongoDB ID
    const portfolio = await PortfolioPost.findById(id);
    if (!portfolio) {
      return res.status(404).json({ message: "Portfolio not found" });
    }

    // Get all comments for this portfolio (both top-level and replies)
    const allComments = await PortfolioComment.find({
      portfolio: portfolio._id,
    })
      .sort({ createdAt: -1 })
      .populate("author", "username")
      .lean();

    // Organize comments into a hierarchy
    const commentMap = {};
    const topLevelComments = [];

    // First pass: create a map of all comments
    allComments.forEach((comment) => {
      comment.replies = [];
      commentMap[comment._id.toString()] = comment;
    });

    // Second pass: organize into hierarchy
    allComments.forEach((comment) => {
      if (comment.parentComment) {
        const parentId = comment.parentComment.toString();
        const parent = commentMap[parentId];
        if (parent) {
          parent.replies.push(comment);
        }
      } else {
        topLevelComments.push(comment);
      }
    });

    // Sort replies by creation date (oldest first for better conversation flow)
    topLevelComments.forEach((comment) => {
      comment.replies.sort(
        (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
      );
    });

    res.status(200).json(topLevelComments);
  } catch (error) {
    console.error("Error fetching portfolio comments:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

/**
 * Create a new portfolio comment
 *
 * Creates a new comment or reply for a portfolio.
 * Handles both top-level comments and replies to existing comments.
 * Supports anonymous commenting.
 *
 * @param {Object} req - Express request object with content, portfolioId, and optional parentCommentId
 * @param {Object} res - Express response object
 * @returns {Object} - Created comment details
 */
exports.createPortfolioComment = async (req, res) => {
  try {
    const { content, portfolioId, parentCommentId, isAnonymous } = req.body;
    const userId = req.userId;

    // Validate required fields
    if (!content || !content.trim()) {
      return res.status(400).json({
        success: false,
        message: "Comment content is required",
      });
    }

    if (!portfolioId) {
      return res.status(400).json({
        success: false,
        message: "Portfolio ID is required",
      });
    }

    // Validate portfolio ID format
    if (!mongoose.Types.ObjectId.isValid(portfolioId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid portfolio ID format",
      });
    }

    // Check if portfolio exists
    const portfolio = await PortfolioPost.findById(portfolioId);
    if (!portfolio) {
      return res.status(404).json({
        success: false,
        message: "Portfolio not found",
      });
    }

    // If replying to a comment, validate parent comment exists
    if (parentCommentId) {
      if (!mongoose.Types.ObjectId.isValid(parentCommentId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid parent comment ID format",
        });
      }

      const parentComment = await PortfolioComment.findById(parentCommentId);
      if (!parentComment) {
        return res.status(404).json({
          success: false,
          message: "Parent comment not found",
        });
      }
    }

    // Determine if this should be an anonymous comment
    const shouldBeAnonymous = isAnonymous || !userId;

    // Create the comment
    const comment = new PortfolioComment({
      content: content.trim(),
      author: shouldBeAnonymous ? null : userId,
      portfolio: portfolioId,
      parentComment: parentCommentId,
      isAnonymous: shouldBeAnonymous,
      isReply: !!parentCommentId,
    });

    await comment.save();

    // Update the portfolio's lastComment field and comment count
    if (portfolio) {
      portfolio.lastComment = {
        content:
          content.length > 200 ? content.substring(0, 197) + "..." : content,
        author: shouldBeAnonymous
          ? "Anonymous"
          : req.user?.username || "Anonymous",
        authorId: shouldBeAnonymous ? null : userId,
        date: new Date(),
        commentId: comment._id,
      };
      portfolio.commentCount = (portfolio.commentCount || 0) + 1;
      await portfolio.save();
    }

    // Populate author information for the response (only if not anonymous)
    if (!shouldBeAnonymous) {
      await comment.populate("author", "username");
    }

    res.status(201).json({
      success: true,
      data: comment,
      message: "Comment created successfully",
    });
  } catch (error) {
    console.error("Error creating portfolio comment:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create comment",
      error: error.message,
    });
  }
};

// Export individual functions (following existing controller patterns)
module.exports = {
  getAllPortfolios: exports.getAllPortfolios,
  getPortfolioById: exports.getPortfolioById,
  createPortfolio: exports.createPortfolio,
  deletePortfolio: exports.deletePortfolio,
  votePortfolio: exports.votePortfolio,
  removeVote: exports.removeVote,
  getPortfolioComments: exports.getPortfolioComments,
  createPortfolioComment: exports.createPortfolioComment,
};
