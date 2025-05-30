const mongoose = require("mongoose");
const Comment = require("../models/comment.model");
const Stock = require("../models/stock.model");
require("dotenv").config();

async function cleanupComments() {
  try {
    // Connect to MongoDB
    await mongoose.connect(
      process.env.MONGODB_URI || "mongodb://localhost:27017/stockforum"
    );
    console.log("Connected to MongoDB");

    // Delete all comments
    const deleteResult = await Comment.deleteMany({});
    console.log(`Deleted ${deleteResult.deletedCount} comments`);

    // Reset stock comment data
    const updateResult = await Stock.updateMany(
      {},
      {
        $set: {
          commentCount: 0,
          lastComment: null,
        },
      }
    );
    console.log(`Updated ${updateResult.modifiedCount} stocks`);

    console.log("Cleanup completed successfully");
  } catch (error) {
    console.error("Error during cleanup:", error);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB");
  }
}

// Run the cleanup
cleanupComments();
