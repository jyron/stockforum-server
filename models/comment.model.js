const mongoose = require("mongoose");

const commentSchema = new mongoose.Schema(
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
    anonymousAuthorId: {
      type: String,
      required: false,
    },
    isAnonymous: {
      type: Boolean,
      default: false,
    },
    stock: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Stock",
      required: false,
    },
    conversation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Conversation",
      required: false,
    },
    // For nested comments (replies)
    parentComment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Comment",
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
commentSchema.virtual("replies", {
  ref: "Comment",
  localField: "_id",
  foreignField: "parentComment",
});

// Add validation to ensure either stock or conversation is provided
commentSchema.pre("save", function (next) {
  if (!this.stock && !this.conversation) {
    next(
      new Error(
        "Comment must be associated with either a stock or a conversation"
      )
    );
  } else if (this.stock && this.conversation) {
    next(
      new Error(
        "Comment cannot be associated with both a stock and a conversation"
      )
    );
  }
  next();
});

const Comment = mongoose.model("Comment", commentSchema);

module.exports = Comment;
