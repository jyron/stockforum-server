const User = require("../models/user.model");
const jwt = require("jsonwebtoken");

// JWT secret key
const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

// Register a new user
exports.register = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      return res.status(400).json({
        message: "User with this email or username already exists",
      });
    }

    // Create new user
    const user = new User({
      username,
      email,
      password,
    });

    await user.save();

    // Generate JWT token
    const token = jwt.sign(
      { id: user._id, username: user.username },
      JWT_SECRET,
      { expiresIn: "24h" }
    );

    res.status(201).json({
      message: "User registered successfully",
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Login user
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: user._id, username: user.username },
      JWT_SECRET,
      { expiresIn: "24h" }
    );

    res.status(200).json({
      message: "Login successful",
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get current user
exports.getCurrentUser = async (req, res) => {
  try {
    const user = await User.findById(req.userId).select("-password");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Helper function to generate the OAuth response HTML
const generateOAuthResponse = (data, error = null) => {
  const responseData = error
    ? { type: "social_auth_error", error }
    : { type: "social_auth_success", ...data };

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Authentication Complete</title>
      </head>
      <body>
        <script>
          function getOpenerOrigin() {
            // Try to get origin from referrer first
            if (document.referrer) {
              return new URL(document.referrer).origin;
            }
            
            // Fallback to environment variable or default
            return "${process.env.CLIENT_URL || "http://localhost:3000"}";
          }

          try {
            if (window.opener) {
              const targetOrigin = getOpenerOrigin();
              console.log('Sending auth response to:', targetOrigin);
              window.opener.postMessage(${JSON.stringify(
                responseData
              )}, targetOrigin);
            }
          } catch (err) {
            console.error('Error posting message:', err);
          } finally {
            // Close the popup after a short delay
            setTimeout(() => window.close(), 1000);
          }
        </script>
        <p>Authentication complete. You can close this window.</p>
      </body>
    </html>
  `;
};

// Google OAuth callback handler
exports.googleCallback = async (req, res) => {
  try {
    console.log("Google callback received:", {
      user: req.user,
      headers: req.headers,
      referrer: req.headers.referer,
    });

    if (!req.user) {
      console.log("No user data in request");
      return res.send(
        generateOAuthResponse(null, "Google authentication failed")
      );
    }

    const token = jwt.sign({ id: req.user._id }, JWT_SECRET, {
      expiresIn: "24h",
    });

    const responseData = {
      user: {
        id: req.user._id,
        email: req.user.email,
        username: req.user.username,
      },
      token,
    };

    console.log("Sending OAuth response:", responseData);

    // Set security headers
    res.setHeader("Cross-Origin-Opener-Policy", "unsafe-none");
    res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
    res.setHeader("Cross-Origin-Embedder-Policy", "unsafe-none");

    // Set CORS headers
    const clientOrigin = process.env.CLIENT_URL || "http://localhost:3000";
    res.setHeader("Access-Control-Allow-Origin", clientOrigin);
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization"
    );
    res.setHeader("Access-Control-Allow-Credentials", "true");

    return res.send(generateOAuthResponse(responseData));
  } catch (error) {
    console.error("Google callback error:", error);
    return res.send(
      generateOAuthResponse(null, "Internal server error during authentication")
    );
  }
};
