const mongoose = require("mongoose");

const portfolioVoteSchema = new mongoose.Schema(
  {
    portfolio: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PortfolioPost",
      required: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false, // Allow anonymous voting
    },
    voteType: {
      type: String,
      required: true,
      enum: ["upvote", "downvote"],
    },
    // For anonymous voting tracking
    ipAddress: {
      type: String,
      required: false,
    },
    // Optional user agent for additional anonymous tracking
    userAgent: {
      type: String,
      required: false,
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

// Compound unique indexes to prevent duplicate votes
// For authenticated users
portfolioVoteSchema.index(
  { portfolio: 1, user: 1 },
  {
    unique: true,
    partialFilterExpression: { user: { $exists: true } },
  }
);

// For anonymous users (IP-based)
portfolioVoteSchema.index(
  { portfolio: 1, ipAddress: 1 },
  {
    unique: true,
    partialFilterExpression: { user: { $exists: false } },
  }
);

// Pre-save validation
portfolioVoteSchema.pre("save", function (next) {
  // Ensure either user or ipAddress is provided
  if (!this.user && !this.ipAddress) {
    next(new Error("Vote must have either a user or an IP address"));
  }

  // If user is provided, ipAddress should be optional
  // If user is not provided, ipAddress is required for anonymous voting
  if (!this.user && !this.ipAddress) {
    next(new Error("Anonymous votes must include an IP address"));
  }

  next();
});

const PortfolioVote = mongoose.model("PortfolioVote", portfolioVoteSchema);

module.exports = PortfolioVote;
