const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: [true, "Email is required for creating an account"],
      trim: true, // email ke aage peeche space nahi hona chahiye
      lowercase: true,
      match: [
        /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
        "Invalid Email Address",
      ], // email format check karne ke liye regex
      unique: [true, "Email already exists"],
    },
    name: {
      type: String,
      required: [true, "Name is required for creating an account"],
    },
    password: {
      type: String,
      required: [true, "Password is required for creating an account"],
      minlength: [6, "Password must be at least 6 characters long"],
      select: false, // jab bhi user ko fetch karenge to password field nahi aayega by default, security ke liye
    },
    systemUser: {
      type: Boolean,
      default: false,
      immutable: true,
      select: false,
    },
  },
  {
    timestamps: true,
  },
);
//when we save the user to DB, usse pehle ye function chalega, isme hum password ko hash karenge before saving to DB, security ke liye
userSchema.pre("save", async function () {
  if (!this.isModified("password")) {
    return;
  }
  const hash = await bcrypt.hash(this.password, 10);
  this.password = hash;
  return;
});

// this method will be used to compare the password entered by the user with the hashed password stored in the database, when user tries to login
userSchema.methods.comparePassword = async function (password) {
  // return true if password matches else false
  return await bcrypt.compare(password, this.password);
};

const userModel = mongoose.model("user", userSchema);

module.exports = userModel;
