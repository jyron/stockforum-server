/**
 * Comment Controller
 *
 * Handles all comment-related operations including creating, updating, and deleting comments,
 * as well as managing replies and like/dislike functionality.
 */

const Comment = require("../models/comment.model");
const Stock = require("../models/stock.model");
const mongoose = require("mongoose");

// Helper function to check if a user has already liked/disliked a comment
const hasUserVoted = async (commentId, userId, type) => {
  const comment = await Comment.findById(commentId);
  if (!comment) return false;

  if (type === "like") {
    return (
      comment.likedBy.includes(userId) ||
      comment.likedByAnonymous.includes(userId)
    );
  }

  return (
    comment.dislikedBy.includes(userId) ||
    comment.dislikedByAnonymous.includes(userId)
  );
};

/**
 * Get all comments for a stock
 *
 * Retrieves top-level comments (not replies) for a specific stock,
 * with populated author information and nested replies.
 *
 * @param {Object} req - Express request object with stockId parameter
 * @param {Object} res - Express response object
 * @returns {Array} - List of comments with their replies
 */
exports.getStockComments = async (req, res) => {
  try {
    const { stockId } = req.params;

    // Validate MongoDB ObjectId format
    if (!mongoose.Types.ObjectId.isValid(stockId)) {
      return res.status(400).json({ message: "Invalid stock ID format" });
    }

    // Find the stock by MongoDB ID
    const stock = await Stock.findById(stockId);
    if (!stock) {
      return res.status(404).json({ message: "Stock not found" });
    }

    // Get all comments for this stock (both top-level and replies)
    const allComments = await Comment.find({ stock: stock._id })
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
    console.error("Error fetching comments:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

/**
 * Create a new comment
 *
 * Creates a new comment or reply for a stock.
 * Handles both top-level comments and replies to existing comments.
 * Supports anonymous commenting.
 *
 * @param {Object} req - Express request object with content, stockId, and optional parentCommentId
 * @param {Object} res - Express response object
 * @returns {Object} - Created comment details
 */
exports.createComment = async (req, res) => {
  try {
    const { content, stockId, parentCommentId, isAnonymous } = req.body;
    const userId = req.userId;

    // Determine if this should be an anonymous comment
    const shouldBeAnonymous = isAnonymous || !userId;

    // Create the comment
    const comment = new Comment({
      content,
      author: shouldBeAnonymous ? null : userId,
      stock: stockId,
      parentComment: parentCommentId,
      isAnonymous: shouldBeAnonymous,
      isReply: !!parentCommentId,
    });

    await comment.save();

    // Update the stock's lastComment field
    const stock = await Stock.findById(stockId);
    if (stock) {
      stock.lastComment = {
        content:
          content.length > 200 ? content.substring(0, 197) + "..." : content,
        author: shouldBeAnonymous
          ? "Anonymous"
          : req.user?.username || "Anonymous",
        authorId: shouldBeAnonymous ? null : userId,
        date: new Date(),
        commentId: comment._id,
      };
      stock.commentCount = (stock.commentCount || 0) + 1;
      await stock.save();
    }

    // Populate author information for the response (only if not anonymous)
    if (!shouldBeAnonymous) {
      await comment.populate("author", "username");
    }

    res.status(201).json({
      success: true,
      data: comment,
    });
  } catch (error) {
    console.error("Error creating comment:", error);
    res.status(500).json({
      success: false,
      error: "Failed to create comment",
    });
  }
};

/**
 * Update a comment
 *
 * Updates the content of an existing comment.
 * Only allows the author to update their own comments.
 *
 * @param {Object} req - Express request object with comment ID and updated content
 * @param {Object} res - Express response object
 * @returns {Object} - Updated comment details
 */
exports.updateComment = async (req, res) => {
  try {
    const { content } = req.body;
    const { id } = req.params;

    if (!content || !content.trim()) {
      return res.status(400).json({ message: "Comment content is required" });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid comment ID format" });
    }

    const comment = await Comment.findById(id);
    if (!comment) {
      return res.status(404).json({ message: "Comment not found" });
    }

    // Check if user is the author (only authenticated users can update)
    // Anonymous comments cannot be updated
    if (
      !req.userId ||
      comment.isAnonymous ||
      !comment.author ||
      comment.author.toString() !== req.userId
    ) {
      return res
        .status(403)
        .json({ message: "Not authorized to update this comment" });
    }

    comment.content = content.trim();
    await comment.save();

    await comment.populate("author", "username");

    res.status(200).json({
      message: "Comment updated successfully",
      comment,
    });
  } catch (error) {
    console.error("Error updating comment:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

/**
 * Delete a comment
 *
 * Deletes a comment and all its replies if it's a parent comment.
 * Only allows the author to delete their own comments.
 *
 * @param {Object} req - Express request object with comment ID
 * @param {Object} res - Express response object
 * @returns {Object} - Success message
 */
exports.deleteComment = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    const comment = await Comment.findById(id);
    if (!comment) {
      return res.status(404).json({
        success: false,
        error: "Comment not found",
      });
    }

    // Check if user is authorized to delete
    // Anonymous comments cannot be deleted, and only the author can delete their own comments
    if (
      comment.isAnonymous ||
      !comment.author ||
      comment.author.toString() !== userId
    ) {
      return res.status(403).json({
        success: false,
        error: "Not authorized to delete this comment",
      });
    }

    const stockId = comment.stock;
    await comment.deleteOne();

    // Update the stock's lastComment field
    const stock = await Stock.findById(stockId);
    if (stock) {
      // If the deleted comment was the lastComment, find the next most recent comment
      if (stock.lastComment && stock.lastComment.commentId.toString() === id) {
        const nextComment = await Comment.findOne({ stock: stockId })
          .sort({ createdAt: -1 })
          .populate("author", "username");

        if (nextComment) {
          stock.lastComment = {
            content:
              nextComment.content.length > 200
                ? nextComment.content.substring(0, 197) + "..."
                : nextComment.content,
            author: nextComment.isAnonymous
              ? "Anonymous"
              : nextComment.author?.username || "Anonymous",
            authorId: nextComment.isAnonymous ? null : nextComment.author?._id,
            date: nextComment.createdAt,
            commentId: nextComment._id,
          };
        } else {
          stock.lastComment = null;
        }
      }
      stock.commentCount = Math.max(0, (stock.commentCount || 0) - 1);
      await stock.save();
    }

    res.json({
      success: true,
      data: {},
    });
  } catch (error) {
    console.error("Error deleting comment:", error);
    res.status(500).json({
      success: false,
      error: "Failed to delete comment",
    });
  }
};

/**
 * Like a comment
 *
 * Adds a like to a comment and removes any existing dislike from the same user.
 * Prevents duplicate likes from the same user.
 * Supports both authenticated and anonymous users.
 *
 * @param {Object} req - Express request object with comment ID
 * @param {Object} res - Express response object
 * @returns {Object} - Updated like/dislike counts
 */
exports.likeComment = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid comment ID format" });
    }

    const comment = await Comment.findById(id);
    if (!comment) {
      return res.status(404).json({ message: "Comment not found" });
    }

    // Get user identifier (authenticated user ID or anonymous session)
    let userIdentifier;
    let isAuthenticated = false;

    if (req.userId) {
      userIdentifier = req.userId;
      isAuthenticated = true;
    } else {
      // For anonymous users, use session ID or IP
      userIdentifier = req.sessionID || req.ip || "anonymous_" + Date.now();
    }

    const userIdString = userIdentifier.toString();

    // Initialize arrays if they don't exist
    if (!comment.likedBy) comment.likedBy = [];
    if (!comment.dislikedBy) comment.dislikedBy = [];
    if (!comment.likedByAnonymous) comment.likedByAnonymous = [];
    if (!comment.dislikedByAnonymous) comment.dislikedByAnonymous = [];

    // Check if user already liked this comment
    const alreadyLiked = isAuthenticated
      ? comment.likedBy.some((id) => id.toString() === userIdString)
      : comment.likedByAnonymous.includes(userIdString);

    if (alreadyLiked) {
      return res
        .status(400)
        .json({ message: "You already liked this comment" });
    }

    // Remove from dislike arrays if previously disliked
    const previouslyDisliked = isAuthenticated
      ? comment.dislikedBy.some((id) => id.toString() === userIdString)
      : comment.dislikedByAnonymous.includes(userIdString);

    if (previouslyDisliked) {
      if (isAuthenticated) {
        comment.dislikedBy = comment.dislikedBy.filter(
          (id) => id.toString() !== userIdString
        );
      } else {
        comment.dislikedByAnonymous = comment.dislikedByAnonymous.filter(
          (id) => id !== userIdString
        );
      }
      comment.dislikes = Math.max(0, comment.dislikes - 1);
    }

    // Add like
    if (isAuthenticated) {
      comment.likedBy.push(userIdentifier);
    } else {
      comment.likedByAnonymous.push(userIdString);
    }
    comment.likes += 1;

    await comment.save();

    res.status(200).json({
      message: "Comment liked successfully",
      likes: comment.likes,
      dislikes: comment.dislikes,
    });
  } catch (error) {
    console.error("Error liking comment:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

/**
 * Dislike a comment
 *
 * Adds a dislike to a comment and removes any existing like from the same user.
 * Prevents duplicate dislikes from the same user.
 * Supports both authenticated and anonymous users.
 *
 * @param {Object} req - Express request object with comment ID
 * @param {Object} res - Express response object
 * @returns {Object} - Updated like/dislike counts
 */
exports.dislikeComment = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid comment ID format" });
    }

    const comment = await Comment.findById(id);
    if (!comment) {
      return res.status(404).json({ message: "Comment not found" });
    }

    // Get user identifier (authenticated user ID or anonymous session)
    let userIdentifier;
    let isAuthenticated = false;

    if (req.userId) {
      userIdentifier = req.userId;
      isAuthenticated = true;
    } else {
      // For anonymous users, use session ID or IP
      userIdentifier = req.sessionID || req.ip || "anonymous_" + Date.now();
    }

    const userIdString = userIdentifier.toString();

    // Initialize arrays if they don't exist
    if (!comment.likedBy) comment.likedBy = [];
    if (!comment.dislikedBy) comment.dislikedBy = [];
    if (!comment.likedByAnonymous) comment.likedByAnonymous = [];
    if (!comment.dislikedByAnonymous) comment.dislikedByAnonymous = [];

    // Check if user already disliked this comment
    const alreadyDisliked = isAuthenticated
      ? comment.dislikedBy.some((id) => id.toString() === userIdString)
      : comment.dislikedByAnonymous.includes(userIdString);

    if (alreadyDisliked) {
      return res
        .status(400)
        .json({ message: "You already disliked this comment" });
    }

    // Remove from like arrays if previously liked
    const previouslyLiked = isAuthenticated
      ? comment.likedBy.some((id) => id.toString() === userIdString)
      : comment.likedByAnonymous.includes(userIdString);

    if (previouslyLiked) {
      if (isAuthenticated) {
        comment.likedBy = comment.likedBy.filter(
          (id) => id.toString() !== userIdString
        );
      } else {
        comment.likedByAnonymous = comment.likedByAnonymous.filter(
          (id) => id !== userIdString
        );
      }
      comment.likes = Math.max(0, comment.likes - 1);
    }

    // Add dislike
    if (isAuthenticated) {
      comment.dislikedBy.push(userIdentifier);
    } else {
      comment.dislikedByAnonymous.push(userIdString);
    }
    comment.dislikes += 1;

    await comment.save();

    res.status(200).json({
      message: "Comment disliked successfully",
      likes: comment.likes,
      dislikes: comment.dislikes,
    });
  } catch (error) {
    console.error("Error disliking comment:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
