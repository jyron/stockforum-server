require("dotenv").config();
const mongoose = require("mongoose");
const { updateStocksFromFMP } = require("../utils/stockUpdater");

// Get API key from environment variable
const apiKey = process.env.FMP_API_KEY;

if (!apiKey) {
  console.error("FMP_API_KEY environment variable is required");
  process.exit(1);
}

// Connect to MongoDB
mongoose
  .connect(process.env.MONGODB_URI || "mongodb://localhost:27017/stock-forum")
  .then(async () => {
    console.log("Connected to MongoDB");

    try {
      console.log("Starting stock update process...");
      const stats = await updateStocksFromFMP(apiKey);
      console.log("Stock update completed:");
      console.log(`Successfully updated: ${stats.success} stocks`);
      console.log(`Failed to update: ${stats.failed} stocks`);
    } catch (error) {
      console.error("Error updating stocks:", error);
    } finally {
      // Close MongoDB connection
      await mongoose.connection.close();
      console.log("MongoDB connection closed");
      process.exit(0);
    }
  })
  .catch((error) => {
    console.error("MongoDB connection error:", error);
    process.exit(1);
  });
