const sharp = require("sharp");

// Image processing configuration
const IMAGE_CONFIG = {
  thumbnail: {
    width: 300,
    height: 300,
    quality: 80,
  },
  medium: {
    width: 800,
    height: 600,
    quality: 85,
  },
  full: {
    width: 1200,
    height: 900,
    quality: 90,
  },
  formats: {
    jpeg: { quality: 85 },
    png: { quality: 85 },
    webp: { quality: 80 },
  },
};

// Generate thumbnail from image buffer
const generateThumbnail = async (imageBuffer) => {
  try {
    const thumbnail = await sharp(imageBuffer)
      .resize(IMAGE_CONFIG.thumbnail.width, IMAGE_CONFIG.thumbnail.height, {
        fit: "cover",
        position: "center",
      })
      .jpeg({ quality: IMAGE_CONFIG.thumbnail.quality })
      .toBuffer();

    return thumbnail;
  } catch (error) {
    console.error("Thumbnail generation error:", error);
    throw new Error(`Failed to generate thumbnail: ${error.message}`);
  }
};

// Optimize image (compress and resize)
const optimizeImage = async (imageBuffer, size = "medium") => {
  try {
    const config = IMAGE_CONFIG[size] || IMAGE_CONFIG.medium;

    const optimized = await sharp(imageBuffer)
      .resize(config.width, config.height, {
        fit: "inside",
        withoutEnlargement: true,
      })
      .jpeg({ quality: config.quality })
      .toBuffer();

    return optimized;
  } catch (error) {
    console.error("Image optimization error:", error);
    throw new Error(`Failed to optimize image: ${error.message}`);
  }
};

// Convert image format
const convertFormat = async (imageBuffer, format = "jpeg") => {
  try {
    let processed = sharp(imageBuffer);

    switch (format.toLowerCase()) {
      case "jpeg":
      case "jpg":
        processed = processed.jpeg(IMAGE_CONFIG.formats.jpeg);
        break;
      case "png":
        processed = processed.png(IMAGE_CONFIG.formats.png);
        break;
      case "webp":
        processed = processed.webp(IMAGE_CONFIG.formats.webp);
        break;
      default:
        processed = processed.jpeg(IMAGE_CONFIG.formats.jpeg);
    }

    const converted = await processed.toBuffer();
    return converted;
  } catch (error) {
    console.error("Format conversion error:", error);
    throw new Error(`Failed to convert image format: ${error.message}`);
  }
};

// Auto-blur sensitive information (basic implementation)
const autoBlurImage = async (imageBuffer, blurLevel = 5) => {
  try {
    const blurred = await sharp(imageBuffer).blur(blurLevel).toBuffer();

    return blurred;
  } catch (error) {
    console.error("Auto-blur error:", error);
    throw new Error(`Failed to blur image: ${error.message}`);
  }
};

// Get image metadata
const getImageMetadata = async (imageBuffer) => {
  try {
    const metadata = await sharp(imageBuffer).metadata();
    return {
      width: metadata.width,
      height: metadata.height,
      format: metadata.format,
      size: metadata.size,
      hasAlpha: metadata.hasAlpha,
      channels: metadata.channels,
    };
  } catch (error) {
    console.error("Metadata extraction error:", error);
    throw new Error(`Failed to extract image metadata: ${error.message}`);
  }
};

// Process portfolio image (main function)
const processPortfolioImage = async (imageBuffer, options = {}) => {
  try {
    const {
      generateThumb = true,
      optimize = true,
      convertTo = "jpeg",
      blurSensitive = false,
      blurLevel = 5,
    } = options;

    let processedImage = imageBuffer;
    let thumbnail = null;

    // Get original metadata
    const metadata = await getImageMetadata(imageBuffer);

    // Auto-blur if requested
    if (blurSensitive) {
      processedImage = await autoBlurImage(processedImage, blurLevel);
    }

    // Optimize main image
    if (optimize) {
      processedImage = await optimizeImage(processedImage, "full");
    }

    // Convert format if needed
    if (convertTo) {
      processedImage = await convertFormat(processedImage, convertTo);
    }

    // Generate thumbnail
    if (generateThumb) {
      thumbnail = await generateThumbnail(processedImage);
    }

    return {
      originalImage: processedImage,
      thumbnail: thumbnail,
      metadata: metadata,
      processed: true,
    };
  } catch (error) {
    console.error("Portfolio image processing error:", error);
    throw new Error(`Failed to process portfolio image: ${error.message}`);
  }
};

module.exports = {
  generateThumbnail,
  optimizeImage,
  convertFormat,
  autoBlurImage,
  getImageMetadata,
  processPortfolioImage,
  IMAGE_CONFIG,
};
