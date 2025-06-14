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
    exchangeFullName: {
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
    // Additional market data from FMP
    marketCap: {
      type: Number,
    },
    beta: {
      type: Number,
    },
    lastDividend: {
      type: Number,
    },
    range: {
      type: String,
    },
    change: {
      type: Number,
    },
    volume: {
      type: Number,
    },
    averageVolume: {
      type: Number,
    },
    // Company identifiers
    cik: {
      type: String,
      trim: true,
    },
    isin: {
      type: String,
      trim: true,
    },
    cusip: {
      type: String,
      trim: true,
    },
    // Company information
    industry: {
      type: String,
      trim: true,
    },
    sector: {
      type: String,
      trim: true,
    },
    website: {
      type: String,
      trim: true,
    },
    ceo: {
      type: String,
      trim: true,
    },
    country: {
      type: String,
      trim: true,
    },
    fullTimeEmployees: {
      type: String,
    },
    phone: {
      type: String,
      trim: true,
    },
    address: {
      type: String,
      trim: true,
    },
    city: {
      type: String,
      trim: true,
    },
    state: {
      type: String,
      trim: true,
    },
    zip: {
      type: String,
      trim: true,
    },
    image: {
      type: String,
      trim: true,
    },
    ipoDate: {
      type: Date,
    },
    // Stock type flags
    isEtf: {
      type: Boolean,
      default: false,
    },
    isActivelyTrading: {
      type: Boolean,
      default: true,
    },
    isAdr: {
      type: Boolean,
      default: false,
    },
    isFund: {
      type: Boolean,
      default: false,
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
    dislikedBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
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
