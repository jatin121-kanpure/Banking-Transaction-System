const mongoose = require("mongoose");

const tokenBlacklistSchema = new mongoose.Schema(
  {
    token: {
      type: String,
      required: [true, "Token is required to blacklist"],
      unique: [true, "Token already blacklisted"],
    },
    
  },
  { timestamps: true },
);
//TTL time to leave used token in blacklist collection, after that it will be automatically removed from database
tokenBlacklistSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: 60 * 60 * 24 * 3 },
); //expires after 3 days

const tokenBlacklistModel = mongoose.model(
  "tokenBlacklist",
  tokenBlacklistSchema,
);
module.exports = tokenBlacklistModel;
