const mongoose = require("mongoose");
const { ObjectId } = mongoose.Schema;

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      trim: true,
      required: true,
      max: 12,
      unique: true,
      lowercase: true,
    },
    email: {
      type: String,
      trim: true,
      required: true,
      unique: true,
      index: true,
      lowercase: true,
    },
    picture: {
      type: String,
    },
    owner: {
      type: ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("UserPublicInfo", userSchema);
