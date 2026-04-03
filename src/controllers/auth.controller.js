const userModel = require("../models/user.model");
const tokenBlacklistModel = require("../models/blackList.model");
const jwt = require("jsonwebtoken");
const emailService = require("../services/email.service");

/**
 * - User Registration Controller
 * - POST /api/auth/register
 */
async function userRegisterController(req, res) {
  const { name, email, password } = req.body;
  const isExist = await userModel.findOne({ email: email });
  if (isExist) {
    return res.status(400).json({
      message: "User already exists with this email",
      status: "failed",
    });
  }

  const user = await userModel.create({
    name: name,
    email: email,
    password: password,
  });
  const token = jwt.sign(
    {
      userId: user._id,
    },
    process.env.JWT_SECRET,
    { expiresIn: "3d" },
  );

  res.cookie("token", token);
  res.status(201).json({
    user: {
      _id: user._id,
      email: user.email,
      name: user.name,
    },
    token,
  });
  await emailService.sendRegistrationEmail(user.email, user.name);
}

/**
 * - User Login Controller
 * - POST /api/auth/login
 */
async function userLoginController(req, res) {
  const { email, password } = req.body;

  const user = await userModel
    .findOne({
      email,
    })
    .select("+password"); // password field ko explicitly select karna padega kyunki user model me select: false hai password ke liye, security ke liye
  if (!user) {
    return res.status(401).json({
      message: "Invalid email or password",
    });
  }

  const isValidPassword = await user.comparePassword(password);
  if (!isValidPassword) {
    return res.status(401).json({
      message: "Invalid email or password",
    });
  }

  const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
    expiresIn: "3d",
  });
  res.cookie("token", token);
  res.status(200).json({
    user: {
      _id: user._id,
      email: user.email,
      name: user.name,
    },
    token,
  });
}

/**
 * - User Logout Controller
 * - POST /api/auth/logout
 */
async function userLogoutController(req, res) {
  const token = req.cookies.token || req.headers.authorization?.split(" ")[1];

  if (!token) {
    return res.status(200).json({
      message: "User logged out successfully",
    });
  }

  await tokenBlacklistModel.create({
    token: token,
  });

  res.clearCookie("token");

  return res.status(200).json({
    message: "User logged out successfully",
  });
}

module.exports = {
  userRegisterController,
  userLoginController,
  userLogoutController,
};
