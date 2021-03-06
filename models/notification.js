const mongoose = require("mongoose");
const { ObjectId } = mongoose.Schema;

const userSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    reminderID: {
      type: ObjectId,
      ref: "Reminder",
    },
    remindedAt: {
      type: Date,
    },
    seen: {
      type: Boolean,
      required: true,
    },
    adminPhoto: {
      type: String,
    },
    postedBy: {
      type: ObjectId,
      ref: "User",
    },
    status: {
      type: String,
      required: true,
    },
    sharedReminder: {
      type: Boolean,
      required: true,
    },
    sharedWith: [
      {
        type: ObjectId,
        ref: "User",
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Notification", userSchema);
