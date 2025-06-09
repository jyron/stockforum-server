const User = require("../models/user.model");
const jwt = require("jsonwebtoken");

// JWT secret key
const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

// Register a new user
exports.register = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // Check if user already exists by email
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        message: "User with this email already exists",
      });
    }

    // Generate a unique username if one wasn't provided
    let finalUsername = username;
    let counter = 1;

    while (await User.findOne({ username: finalUsername })) {
      finalUsername = `${username}${counter}`;
      counter++;
    }

    // Create new user
    const user = new User({
      username: finalUsername,
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
          function getAllowedOrigins() {
            const clientUrl = "${
              process.env.CLIENT_URL || "http://localhost:3000"
            }";
            // Add both the exact URL and any potential protocol variations
            return [
              clientUrl,
              clientUrl.replace('http://', 'https://'),
              clientUrl.replace('https://', 'http://')
            ];
          }

          function postMessageToOpener(data) {
            const allowedOrigins = getAllowedOrigins();
            console.log('Allowed origins:', allowedOrigins);
            
            for (const origin of allowedOrigins) {
              try {
                console.log('Attempting to post message to:', origin);
                window.opener.postMessage(data, origin);
              } catch (err) {
                console.error('Error posting to ' + origin + ':', err);
              }
            }
          }

          try {
            if (window.opener) {
              console.log('Found opener window, posting message');
              const data = ${JSON.stringify(responseData)};
              postMessageToOpener(data);
            } else {
              console.error('No opener window found');
            }
          } catch (err) {
            console.error('Error in OAuth response:', err);
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

// Update username
exports.updateUsername = async (req, res) => {
  try {
    const { username } = req.body;

    // Validate username
    if (!username || username.length < 4) {
      return res.status(400).json({
        message: "Username must be at least 4 characters long",
      });
    }

    // Check if username is already taken
    const existingUser = await User.findOne({
      username,
      _id: { $ne: req.userId },
    });
    if (existingUser) {
      return res.status(400).json({
        message: "Username is already taken",
      });
    }

    // Update user
    const user = await User.findByIdAndUpdate(
      req.userId,
      { username },
      { new: true }
    ).select("-password");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({
      message: "Username updated successfully",
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
