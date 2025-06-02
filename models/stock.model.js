const mongoose = require("mongoose");

const stockSchema = new mongoose.Schema(
  {
    symbol: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    // Market data
    exchange: {
      type: String,
      trim: true,
    },
    currency: {
      type: String,
      trim: true,
    },
    currentPrice: {
      type: Number,
      required: true,
    },
    previousClose: {
      type: Number,
    },
    percentChange: {
      type: Number,
      required: true,
    },
    // User interaction data
    likes: {
      type: Number,
      default: 0,
    },
    dislikes: {
      type: Number,
      default: 0,
    },
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
    commentCount: {
      type: Number,
      default: 0,
    },
    lastComment: {
      content: { type: String, maxlength: 200 },
      author: { type: String },
      authorId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      date: { type: Date },
      commentId: { type: mongoose.Schema.Types.ObjectId, ref: "Comment" },
    },
    // Ownership/creation metadata
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    lastUpdated: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

const Stock = mongoose.model("Stock", stockSchema);

module.exports = Stock;
