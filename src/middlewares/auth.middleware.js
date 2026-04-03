const userModel = require("../models/user.model");
const tokenBlacklistModel = require("../models/blackList.model");
const jwt = require("jsonwebtoken");

// middleware which is used to protect routes which require authentication, it will verify the token sent by client in cookie and if valid then it will attach the user object to req and call next() to pass the control to the next middleware or controller, if token is invalid then it will return 401 unauthorized error
async function authMiddleware(req, res, next) {
  const token = req.cookies.token || req.headers.authorization?.split(" ")[1]; // token can be sent in cookie or in authorization header as Bearer token
  if (!token) {
    return res.status(401).json({
      message: "Unauthorized access, token is missing",
    });
  }

  const isBlacklisted = await tokenBlacklistModel.findOne({ token });
  if (isBlacklisted) {
    return res.status(401).json({
      message: "Unauthorized access, token is blacklisted",
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await userModel.findById(decoded.userId);
    req.user = user; // attach user object to req so that we can access it in controllers
    return next();
  } catch (err) {
    return res.status(401).json({
      message: "Unauthorized access, invalid token",
    });
  }
}

async function authSystemUserMiddleware(req, res, next) {
  const token = req.cookies.token || req.headers.authorization?.split(" ")[1];
  if (!token) {
    return res.status(401).json({
      message: "Unauthorized access, token is missing",
    });
  }

  const isBlacklisted = await tokenBlacklistModel.findOne({ token });
  if (isBlacklisted) {
    return res.status(401).json({
      message: "Unauthorized access, token is blacklisted",
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await userModel.findById(decoded.userId).select("+systemUser");
    if (!user || !user.systemUser) {
      return res.status(403).json({
        message: "Forbidden access, user is not a system user",
      });
    }
    req.user = user; // attach user object to req so that we can access it in controllers
    return next();
  } catch (err) {
    return res.status(401).json({
      message: "Unauthorized access, invalid token",
    });
  }
}

module.exports = { authMiddleware, authSystemUserMiddleware };
