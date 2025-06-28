const mongoose = require("mongoose");

const portfolioPostSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 1000,
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    imageUrl: {
      type: String,
      required: true,
      trim: true,
    },
    thumbnailUrl: {
      type: String,
      trim: true,
    },
    performance: {
      type: String,
      trim: true,
      maxlength: 50,
    },
    category: {
      type: String,
      trim: true,
      enum: ["YOLO", "LOSSES", "BOOMER", "GAINS", "CRYPTO", "OPTIONS", "OTHER"],
      default: "OTHER",
    },
    // User interaction data (following stock.model.js patterns)
    upvotes: {
      type: Number,
      default: 0,
    },
    downvotes: {
      type: Number,
      default: 0,
    },
    commentCount: {
      type: Number,
      default: 0,
    },
    lastComment: {
      content: { type: String, maxlength: 200 },
      author: { type: String },
      authorId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      date: { type: Date },
      commentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "PortfolioComment",
      },
    },
    // Premium status flag
    isPremium: {
      type: Boolean,
      default: false,
    },
    // Moderation status
    isApproved: {
      type: Boolean,
      default: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Add indexes for efficient querying
portfolioPostSchema.index({ author: 1 });
portfolioPostSchema.index({ category: 1 });
portfolioPostSchema.index({ createdAt: -1 });
portfolioPostSchema.index({ upvotes: -1 });

const PortfolioPost = mongoose.model("PortfolioPost", portfolioPostSchema);

module.exports = PortfolioPost;
