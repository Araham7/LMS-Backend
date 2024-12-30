import { Schema, model } from "mongoose";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from "crypto";

const userSchema = new Schema(
  {
    fullName: {
      type: String,
      required: [true, "Name is required!"],
      unique: true,
      minLength: [5, "Name must be at least 5 characters!"],
      maxLength: [50, "Name must not exceed 50 characters!"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Email is required!"],
      lowercase: true,
      trim: true,
      unique: true,
      index: true,
      match: [
        /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/,
        "Please enter a valid email address!",
      ],
    },
    password: {
      type: String,
      required: [true, "Password is required!"],
      minLength: [5, "Password must be at least 5 characters!"],
      select: false,
    },
    avatar: {
      public_id: { type: String, default: null },
      secure_url: { type: String, default: null },
    },
    role: {
      type: String,
      enum: ["USER", "ADMIN"],
      default: "USER",
    },
    subscription: {
      id: { type: String, default: null },
      status: { 
        type: String,
        default: "inactive" 
      },
    },
    forgotPasswordToken: { 
      type: String, 
      default: null 
    },
    forgotPasswordExpiry: { 
      type: Date, 
      default: null 
    },
  },
  {
    timestamps: true,
  }
);

// Hash password before saving to the database
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) {
    return next();
  }
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

// Custom mongoose methods
userSchema.methods = {

  // 1. Generate JWT-Token
  generateJWTtoken: function () {
    return jwt.sign(
      {
        id: this._id,
        email: this.email,
        role: this.role,
        subscription: this.subscription,
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRY }
    );
  },

  // 2. Compare plain text password with hashed password
  comparePassword: async function (plainTextPassword) {
    return bcrypt.compare(plainTextPassword, this.password);
  },

  // 3. Generate Password Reset Token
  generatePasswordResetToken: function () {
    const resetToken = crypto.randomBytes(20).toString("hex");

    // Store hashed token in the database
    this.forgotPasswordToken = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");

    this.forgotPasswordExpiry = Date.now() + 15 * 60 * 1000; // Token valid for 15 minutes

    return resetToken;
  },
};

const User = model("User", userSchema);
export default User;
