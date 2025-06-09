const mongoose = require("mongoose");
const User = require("../models/user.model");
require("dotenv").config();

const makeUserAdmin = async (email) => {
  try {
    // Connect to MongoDB
    await mongoose.connect(
      process.env.MONGODB_URI || "mongodb://localhost:27017/stock-forum",
      {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      }
    );

    // Find and update the user
    const user = await User.findOneAndUpdate(
      { email },
      { isAdmin: true },
      { new: true }
    );

    if (!user) {
      console.error("User not found with email:", email);
      process.exit(1);
    }

    console.log("Successfully made user admin:", {
      email: user.email,
      username: user.username,
      isAdmin: user.isAdmin,
    });

    process.exit(0);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
};

// Get email from command line argument
const email = process.argv[2];

if (!email) {
  console.error("Please provide an email address");
  console.log("Usage: node makeAdmin.js <email>");
  process.exit(1);
}

makeUserAdmin(email);
