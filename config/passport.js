const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const User = require("../models/user.model");

// Google OAuth Strategy
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: `${
        process.env.API_URL || "http://localhost:5000"
      }/api/auth/google/callback`,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        // Check if user already exists
        let user = await User.findOne({ email: profile.emails[0].value });

        if (user) {
          // Update user's Google ID and profile if not set
          if (!user.googleId) {
            user.googleId = profile.id;
            // Only update username if it was auto-generated (contains the random string)
            if (user.username.includes("user_")) {
              user.username = profile.displayName
                .replace(/\s+/g, "_")
                .toLowerCase();
            }
            await user.save();
          }
          return done(null, user);
        }

        // Generate a unique username from display name
        const baseUsername = profile.displayName
          .replace(/\s+/g, "_")
          .toLowerCase();
        let username = baseUsername;
        let counter = 1;

        // Keep trying until we find a unique username
        while (await User.findOne({ username })) {
          username = `${baseUsername}_${counter}`;
          counter++;
        }

        // Create new user
        user = new User({
          username,
          email: profile.emails[0].value,
          googleId: profile.id,
          password: Math.random().toString(36).slice(-8), // Random password for social auth users
        });

        await user.save();
        done(null, user);
      } catch (error) {
        console.error("Passport Google Strategy Error:", error);
        done(error, null);
      }
    }
  )
);

module.exports = passport;
