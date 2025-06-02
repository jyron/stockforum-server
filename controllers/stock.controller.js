/**
 * Stock Controller
 *
 * Handles all stock-related operations including CRUD operations
 * and like/dislike functionality for stocks.
 */

const Stock = require("../models/stock.model");
const Comment = require("../models/comment.model");
const mongoose = require("mongoose");

/**
 * Get all stocks
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Array} - List of all stocks sorted by creation date
 */
exports.getAllStocks = async (req, res) => {
  try {
    const { search } = req.query;
    console.log("Search query received:", search);
    console.log("Full query object:", req.query);

    let query = {};

    // If search term is provided, search in both symbol and name fields
    if (search && search.trim() !== "") {
      const searchRegex = new RegExp(search.trim(), "i");
      query = {
        $or: [
          { symbol: { $regex: searchRegex } },
          { name: { $regex: searchRegex } },
        ],
      };
      console.log("MongoDB query:", JSON.stringify(query));
    }

    const stocks = await Stock.find(query)
      .sort({ createdAt: -1 })
      .populate("createdBy", "username");

    console.log("Found stocks:", stocks.length);
    if (stocks.length > 0) {
      console.log("First stock:", {
        symbol: stocks[0].symbol,
        name: stocks[0].name,
      });
    }

    // Add comment counts to each stock
    const stocksWithCommentCounts = await Promise.all(
      stocks.map(async (stock) => {
        const commentCount = await Comment.countDocuments({ stock: stock._id });
        return {
          ...stock.toObject(),
          commentCount,
        };
      })
    );

    // Sort stocks by comment count in descending order
    stocksWithCommentCounts.sort((a, b) => b.commentCount - a.commentCount);

    res.status(200).json(stocksWithCommentCounts);
  } catch (error) {
    console.error("Error in getAllStocks:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

/**
 * Get a single stock by ID
 *
 * @param {Object} req - Express request object with stock ID in params
 * @param {Object} res - Express response object
 * @returns {Object} - Stock details
 */
exports.getStockById = async (req, res) => {
  try {
    const { id } = req.params;

    // Only search by MongoDB ID
    const stock = await Stock.findById(id).populate("createdBy", "username");

    if (!stock) {
      return res.status(404).json({ message: "Stock not found" });
    }

    res.status(200).json(stock);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

/**
 * Get a single stock by symbol
 *
 * @param {Object} req - Express request object with stock symbol in params
 * @param {Object} res - Express response object
 * @returns {Object} - Stock details
 */
exports.getStockBySymbol = async (req, res) => {
  try {
    const { symbol } = req.params;

    // First try to find in the Stock collection
    let stock = await Stock.findOne({ symbol: symbol.toUpperCase() }).populate(
      "createdBy",
      "username"
    );

    if (!stock) {
      // If not found, check the Stock collection (for SP500 stocks)
      stock = await Stock.findOne({ symbol: symbol.toUpperCase() });
      if (stock) {
        return res.status(200).json(stock);
      } else {
        return res.status(404).json({ message: "Stock not found" });
      }
    }

    res.status(200).json(stock);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

/**
 * Create a new stock
 *
 * @param {Object} req - Express request object with stock data in body
 * @param {Object} res - Express response object
 * @returns {Object} - Created stock details
 */
exports.createStock = async (req, res) => {
  try {
    const { symbol, name, description, currentPrice } = req.body;

    // Check if stock already exists
    const existingStock = await Stock.findOne({ symbol });
    if (existingStock) {
      return res
        .status(400)
        .json({ message: "Stock with this symbol already exists" });
    }

    const stock = new Stock({
      symbol,
      name,
      description,
      currentPrice,
      createdBy: req.userId,
    });

    await stock.save();

    res.status(201).json({
      message: "Stock created successfully",
      stock,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

/**
 * Update a stock
 *
 * @param {Object} req - Express request object with stock ID in params and updated data in body
 * @param {Object} res - Express response object
 * @returns {Object} - Updated stock details
 */
exports.updateStock = async (req, res) => {
  try {
    const { symbol, name, description, currentPrice } = req.body;

    // Get stock by ID or symbol
    let stock;
    const { id } = req.params;
    const { bySymbol } = req.query;

    if (bySymbol === "true") {
      stock = await Stock.findOne({ symbol: id });
    } else {
      try {
        stock = await Stock.findById(id);
      } catch (idError) {
        stock = await Stock.findOne({ symbol: id });
      }
    }
    if (!stock) {
      return res.status(404).json({ message: "Stock not found" });
    }

    // Update fields
    stock.symbol = symbol || stock.symbol;
    stock.name = name || stock.name;
    stock.description = description || stock.description;
    stock.currentPrice = currentPrice || stock.currentPrice;

    await stock.save();

    res.status(200).json({
      message: "Stock updated successfully",
      stock,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

/**
 * Delete a stock
 *
 * @param {Object} req - Express request object with stock ID in params
 * @param {Object} res - Express response object
 * @returns {Object} - Success message
 */
exports.deleteStock = async (req, res) => {
  try {
    // Get stock by ID only
    const { id } = req.params;

    // Only search by MongoDB ID
    let stock;
    try {
      stock = await Stock.findById(id);
    } catch (error) {
      return res.status(400).json({ message: "Invalid stock ID format" });
    }

    if (!stock) {
      return res.status(404).json({ message: "Stock not found" });
    }

    // Check if user is the creator
    if (stock.createdBy.toString() !== req.userId) {
      return res
        .status(403)
        .json({ message: "Not authorized to delete this stock" });
    }

    // Delete associated comments
    await Comment.deleteMany({ stock: stock._id });

    // Delete the stock
    await Stock.findByIdAndDelete(stock._id);

    res.status(200).json({ message: "Stock deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

/**
 * Like a stock
 *
 * Adds a like to a stock and removes any existing dislike from the same user.
 * Prevents duplicate likes from the same user.
 * Supports both authenticated and anonymous users.
 *
 * @param {Object} req - Express request object with stock ID in params
 * @param {Object} res - Express response object
 * @returns {Object} - Updated like/dislike counts
 */
exports.likeStock = async (req, res) => {
  try {
    console.log("Like stock request received:", {
      stockId: req.params.id,
      userId: req.userId,
      hasAuth: !!req.header("Authorization"),
      ip: req.ip,
    });

    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid stock ID format" });
    }

    const stock = await Stock.findById(id);
    if (!stock) {
      return res.status(404).json({ message: "Stock not found" });
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
    if (!stock.likedBy) stock.likedBy = [];
    if (!stock.dislikedBy) stock.dislikedBy = [];
    if (!stock.likedByAnonymous) stock.likedByAnonymous = [];
    if (!stock.dislikedByAnonymous) stock.dislikedByAnonymous = [];

    // Check if user already liked this stock
    const alreadyLiked = isAuthenticated
      ? stock.likedBy.some((id) => id.toString() === userIdString)
      : stock.likedByAnonymous.includes(userIdString);

    if (alreadyLiked) {
      return res.status(400).json({ message: "You already liked this stock" });
    }

    // Remove from dislike arrays if previously disliked
    const previouslyDisliked = isAuthenticated
      ? stock.dislikedBy.some((id) => id.toString() === userIdString)
      : stock.dislikedByAnonymous.includes(userIdString);

    if (previouslyDisliked) {
      if (isAuthenticated) {
        stock.dislikedBy = stock.dislikedBy.filter(
          (id) => id.toString() !== userIdString
        );
      } else {
        stock.dislikedByAnonymous = stock.dislikedByAnonymous.filter(
          (id) => id !== userIdString
        );
      }
      stock.dislikes = Math.max(0, stock.dislikes - 1);
    }

    // Add like
    if (isAuthenticated) {
      stock.likedBy.push(userIdentifier);
    } else {
      stock.likedByAnonymous.push(userIdString);
    }
    stock.likes += 1;

    await stock.save();

    res.status(200).json({
      message: "Stock liked successfully",
      likes: stock.likes,
      dislikes: stock.dislikes,
    });
  } catch (error) {
    console.error("Error liking stock:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

/**
 * Dislike a stock
 *
 * Adds a dislike to a stock and removes any existing like from the same user.
 * Prevents duplicate dislikes from the same user.
 * Supports both authenticated and anonymous users.
 *
 * @param {Object} req - Express request object with stock ID in params
 * @param {Object} res - Express response object
 * @returns {Object} - Updated like/dislike counts
 */
exports.dislikeStock = async (req, res) => {
  try {
    console.log("Dislike stock request received:", {
      stockId: req.params.id,
      userId: req.userId,
      hasAuth: !!req.header("Authorization"),
      ip: req.ip,
    });

    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid stock ID format" });
    }

    const stock = await Stock.findById(id);
    if (!stock) {
      return res.status(404).json({ message: "Stock not found" });
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
    if (!stock.likedBy) stock.likedBy = [];
    if (!stock.dislikedBy) stock.dislikedBy = [];
    if (!stock.likedByAnonymous) stock.likedByAnonymous = [];
    if (!stock.dislikedByAnonymous) stock.dislikedByAnonymous = [];

    // Check if user already disliked this stock
    const alreadyDisliked = isAuthenticated
      ? stock.dislikedBy.some((id) => id.toString() === userIdString)
      : stock.dislikedByAnonymous.includes(userIdString);

    if (alreadyDisliked) {
      return res
        .status(400)
        .json({ message: "You already disliked this stock" });
    }

    // Remove from like arrays if previously liked
    const previouslyLiked = isAuthenticated
      ? stock.likedBy.some((id) => id.toString() === userIdString)
      : stock.likedByAnonymous.includes(userIdString);

    if (previouslyLiked) {
      if (isAuthenticated) {
        stock.likedBy = stock.likedBy.filter(
          (id) => id.toString() !== userIdString
        );
      } else {
        stock.likedByAnonymous = stock.likedByAnonymous.filter(
          (id) => id !== userIdString
        );
      }
      stock.likes = Math.max(0, stock.likes - 1);
    }

    // Add dislike
    if (isAuthenticated) {
      stock.dislikedBy.push(userIdentifier);
    } else {
      stock.dislikedByAnonymous.push(userIdString);
    }
    stock.dislikes += 1;

    await stock.save();

    res.status(200).json({
      message: "Stock disliked successfully",
      likes: stock.likes,
      dislikes: stock.dislikes,
    });
  } catch (error) {
    console.error("Error disliking stock:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
