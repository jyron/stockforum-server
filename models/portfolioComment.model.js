const mongoose = require("mongoose");

const portfolioCommentSchema = new mongoose.Schema(
  {
    content: {
      type: String,
      required: true,
      trim: true,
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },
    // Flag to indicate if this is an anonymous comment
    isAnonymous: {
      type: Boolean,
      default: false,
    },
    // For portfolio comments
    portfolio: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PortfolioPost",
      required: true,
    },
    // For nested comments (replies)
    parentComment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PortfolioComment",
      default: null,
    },
    likes: {
      type: Number,
      default: 0,
    },
    dislikes: {
      type: Number,
      default: 0,
    },
    // Store users who liked/disliked to prevent duplicate votes
    likedBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    likedByAnonymous: [
      {
        type: String,
      },
    ],
    dislikedBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    dislikedByAnonymous: [
      {
        type: String,
      },
    ],
    // For efficient retrieval of comment threads
    isReply: {
      type: Boolean,
      default: false,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual for replies
portfolioCommentSchema.virtual("replies", {
  ref: "PortfolioComment",
  localField: "_id",
  foreignField: "parentComment",
});

// Pre-save validation middleware (adapted from comment.model.js)
portfolioCommentSchema.pre("save", function (next) {
  // Ensure portfolio is provided
  if (!this.portfolio) {
    next(new Error("Comment must be associated with a portfolio"));
  }

  // Validate that anonymous comments don't have an author
  if (this.isAnonymous && this.author) {
    this.author = null;
  }

  // Validate that non-anonymous comments have an author
  if (!this.isAnonymous && !this.author) {
    next(new Error("Non-anonymous comments must have an author"));
  }

  next();
});

// Add indexes for efficient querying
portfolioCommentSchema.index({ portfolio: 1 });
portfolioCommentSchema.index({ parentComment: 1 });
portfolioCommentSchema.index({ createdAt: -1 });
portfolioCommentSchema.index({ author: 1 });

const PortfolioComment = mongoose.model(
  "PortfolioComment",
  portfolioCommentSchema
);

module.exports = PortfolioComment;
