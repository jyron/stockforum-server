const mongoose = require("mongoose");
const Stock = require("../models/stock.model");
require("dotenv").config();

async function listSectors() {
  try {
    // Connect to MongoDB using the same connection string as the server
    await mongoose.connect(
      process.env.MONGODB_URI || "mongodb://localhost:27017/stock-forum",
      {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      }
    );
    console.log("Connected to MongoDB");

    // Get unique sectors
    const sectors = await Stock.distinct("sector");

    // Filter out null/undefined sectors and sort alphabetically
    const validSectors = sectors
      .filter((sector) => sector)
      .sort((a, b) => a.localeCompare(b));

    console.log("\nAvailable Sectors:");
    console.log("=================");
    validSectors.forEach((sector, index) => {
      console.log(`${index + 1}. ${sector}`);
    });

    // Get count of stocks per sector
    console.log("\nStocks per Sector:");
    console.log("=================");
    for (const sector of validSectors) {
      const count = await Stock.countDocuments({ sector });
      console.log(`${sector}: ${count} stocks`);
    }

    // Get stocks without sectors
    const noSectorCount = await Stock.countDocuments({
      $or: [{ sector: null }, { sector: "" }, { sector: { $exists: false } }],
    });
    if (noSectorCount > 0) {
      console.log(`\nStocks without sector: ${noSectorCount}`);
    }
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await mongoose.disconnect();
    console.log("\nDisconnected from MongoDB");
  }
}

listSectors();
