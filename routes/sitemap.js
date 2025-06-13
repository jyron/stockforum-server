const express = require("express");
const router = express.Router();
const Stock = require("../models/stock.model");
const Article = require("../models/article.model");
const Conversation = require("../models/conversation.model");

router.get("/sitemap.xml", async (req, res) => {
  try {
    // Get all content
    const [stocks, articles, conversations] = await Promise.all([
      Stock.find({}, "symbol"),
      Article.find({}, "_id"),
      Conversation.find({}, "_id"),
    ]);

    // Start building XML
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

    // Add static routes
    xml += "  <!-- Static Routes -->\n";
    xml += "  <url>\n";
    xml += "    <loc>https://stockforum.io/</loc>\n";
    xml += "    <changefreq>daily</changefreq>\n";
    xml += "    <priority>1.0</priority>\n";
    xml += "  </url>\n";
    xml += "  <url>\n";
    xml += "    <loc>https://stockforum.io/articles</loc>\n";
    xml += "    <changefreq>daily</changefreq>\n";
    xml += "    <priority>0.8</priority>\n";
    xml += "  </url>\n";

    // Add stock pages
    xml += "  <!-- Stock Pages -->\n";
    stocks.forEach((stock) => {
      xml += "  <url>\n";
      xml += `    <loc>https://stockforum.io/stocks/${stock.symbol}</loc>\n`;
      xml += "    <changefreq>daily</changefreq>\n";
      xml += "    <priority>0.9</priority>\n";
      xml += "  </url>\n";
    });

    // Add article pages
    xml += "  <!-- Article Pages -->\n";
    articles.forEach((article) => {
      xml += "  <url>\n";
      xml += `    <loc>https://stockforum.io/article/${article._id}</loc>\n`;
      xml += "    <changefreq>weekly</changefreq>\n";
      xml += "    <priority>0.8</priority>\n";
      xml += "  </url>\n";
    });

    // Add conversation pages
    xml += "  <!-- Conversation Pages -->\n";
    conversations.forEach((conversation) => {
      xml += "  <url>\n";
      xml += `    <loc>https://stockforum.io/conversation/${conversation._id}</loc>\n`;
      xml += "    <changefreq>weekly</changefreq>\n";
      xml += "    <priority>0.7</priority>\n";
      xml += "  </url>\n";
    });

    xml += "</urlset>";

    // Set the correct content type and cache control
    res.header("Content-Type", "application/xml");
    res.header("Cache-Control", "public, max-age=3600"); // Cache for 1 hour
    res.send(xml);
  } catch (error) {
    console.error("Error generating sitemap:", error);
    res.status(500).send("Error generating sitemap");
  }
});

module.exports = router;
