const mongoose = require("mongoose");
const { ObjectId } = mongoose.Schema;

const userSchema = new mongoose.Schema(
  {
    title: {
      type: String,
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
    postedBy: {
      type: ObjectId,
      ref: "User",
      required: true,
    },
    status: {
      type: String,
      required: true,
    },
    reminderTypes: {
      type: String,
      required: true,
    },
    sharedWith: [
      {
        type: ObjectId,
        ref: "User",
      },
    ],
    mainNotification: {
      type: ObjectId,
      ref: "Notification",
    },
    acceptOrDeclineFriend: {
      type: String,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Notification", userSchema);
