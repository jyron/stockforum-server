const axios = require("axios");
const Stock = require("../models/stock.model");

/**
 * Updates stock data from Financial Modeling Prep API
 * @param {string} apiKey - The API key for Financial Modeling Prep
 * @returns {Promise<{success: number, failed: number}>} - Number of successfully and failed updates
 */
async function updateStocksFromFMP(apiKey) {
  if (!apiKey) {
    throw new Error("API key is required");
  }

  const stats = {
    success: 0,
    failed: 0,
  };

  try {
    // Get all stocks from database
    const stocks = await Stock.find({});
    console.log(`Found ${stocks.length} stocks to update`);

    // Update each stock
    for (const stock of stocks) {
      try {
        // Fetch data from FMP API
        const response = await axios.get(
          `https://financialmodelingprep.com/stable/profile?symbol=${stock.symbol}&apikey=${apiKey}`
        );

        if (!response.data || !response.data[0]) {
          console.error(`No data returned for ${stock.symbol}`);
          stats.failed++;
          continue;
        }

        const data = response.data[0];

        // Update stock with new data
        stock.name = data.companyName || stock.name;
        stock.description = data.description || stock.description;
        stock.currentPrice = data.price || stock.currentPrice;
        stock.exchange = data.exchange || stock.exchange;
        stock.exchangeFullName =
          data.exchangeFullName || stock.exchangeFullName;
        stock.currency = data.currency || stock.currency;
        stock.marketCap = data.marketCap || stock.marketCap;
        stock.beta = data.beta || stock.beta;
        stock.lastDividend = data.lastDividend || stock.lastDividend;
        stock.range = data.range || stock.range;
        stock.change = data.change || stock.change;
        stock.percentChange = data.changePercentage || stock.percentChange;
        stock.volume = data.volume || stock.volume;
        stock.averageVolume = data.averageVolume || stock.averageVolume;
        stock.cik = data.cik || stock.cik;
        stock.isin = data.isin || stock.isin;
        stock.cusip = data.cusip || stock.cusip;
        stock.industry = data.industry || stock.industry;
        stock.sector = data.sector || stock.sector;
        stock.website = data.website || stock.website;
        stock.ceo = data.ceo || stock.ceo;
        stock.country = data.country || stock.country;
        stock.fullTimeEmployees =
          data.fullTimeEmployees || stock.fullTimeEmployees;
        stock.phone = data.phone || stock.phone;
        stock.address = data.address || stock.address;
        stock.city = data.city || stock.city;
        stock.state = data.state || stock.state;
        stock.zip = data.zip || stock.zip;
        stock.image = data.image || stock.image;
        stock.ipoDate = data.ipoDate ? new Date(data.ipoDate) : stock.ipoDate;
        stock.isEtf = data.isEtf !== undefined ? data.isEtf : stock.isEtf;
        stock.isActivelyTrading =
          data.isActivelyTrading !== undefined
            ? data.isActivelyTrading
            : stock.isActivelyTrading;
        stock.isAdr = data.isAdr !== undefined ? data.isAdr : stock.isAdr;
        stock.isFund = data.isFund !== undefined ? data.isFund : stock.isFund;
        stock.lastUpdated = new Date();

        await stock.save();
        console.log(`Successfully updated ${stock.symbol}`);
        stats.success++;

        // Add a small delay to avoid hitting API rate limits
        await new Promise((resolve) => setTimeout(resolve, 100));
      } catch (error) {
        console.error(`Failed to update ${stock.symbol}:`, error.message);
        stats.failed++;
      }
    }

    return stats;
  } catch (error) {
    console.error("Error in updateStocksFromFMP:", error);
    throw error;
  }
}

module.exports = {
  updateStocksFromFMP,
};
