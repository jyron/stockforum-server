const express = require("express");
const router = express.Router();
const authController = require("../controllers/auth.controller");
const authMiddleware = require("../middleware/auth.middleware");
const passport = require("passport");

// Register a new user
router.post("/register", authController.register);

// Login user
router.post("/login", authController.login);

// Get current user (protected route)
router.get("/me", authMiddleware, authController.getCurrentUser);

// Google OAuth routes
router.get(
  "/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

router.get(
  "/google/callback",
  passport.authenticate("google", { session: false }),
  authController.googleCallback
);

module.exports = router;
