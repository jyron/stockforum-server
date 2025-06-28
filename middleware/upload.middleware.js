const multer = require("multer");

// Configure Multer for memory storage (direct S3 upload without temp files)
const storage = multer.memoryStorage();

// File filter for image validation
const fileFilter = (req, file, cb) => {
  // Allowed MIME types
  const allowedMimeTypes = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/gif",
  ];

  // Allowed file extensions (additional security layer)
  const allowedExtensions = /\.(jpg|jpeg|png|gif)$/i;

  // Check MIME type
  const isMimeTypeValid = allowedMimeTypes.includes(file.mimetype);

  // Check file extension
  const isExtensionValid = allowedExtensions.test(file.originalname);

  if (isMimeTypeValid && isExtensionValid) {
    // Accept the file
    cb(null, true);
  } else {
    // Reject the file with specific error
    cb(
      new Error(
        "Invalid file type. Only JPEG, PNG, and GIF images are allowed."
      ),
      false
    );
  }
};

// Configure upload middleware with security settings
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
    fileFilter: fileFilter,
  },
  fileFilter: fileFilter,
});

// Single file upload middleware
const uploadSingle = upload.single("image");

// Middleware wrapper with enhanced error handling
const uploadMiddleware = (req, res, next) => {
  uploadSingle(req, res, (error) => {
    if (error instanceof multer.MulterError) {
      // Handle Multer-specific errors
      switch (error.code) {
        case "LIMIT_FILE_SIZE":
          return res.status(400).json({
            success: false,
            message: "File too large. Maximum size is 5MB.",
          });
        case "LIMIT_UNEXPECTED_FILE":
          return res.status(400).json({
            success: false,
            message: "Unexpected field name. Use 'image' for the file field.",
          });
        default:
          return res.status(400).json({
            success: false,
            message: `Upload error: ${error.message}`,
          });
      }
    } else if (error) {
      // Handle file filter errors or other errors
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    // Check if file was uploaded
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No file uploaded. Please include a valid image file.",
      });
    }

    // File upload successful, proceed to next middleware
    next();
  });
};

module.exports = {
  uploadMiddleware,
  upload,
};
