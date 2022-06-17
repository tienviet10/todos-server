const mongoose = require("mongoose");
const { ObjectId } = mongoose.Schema;

const userSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      index: true,
    },
    description: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      required: true,
    },
    favorite: {
      type: Boolean,
      required: true,
    },
    color: {
      type: String,
    },
    remindedAt: {
      type: Date,
    },
    repeat: {
      type: String,
    },
    postedBy: {
      type: ObjectId,
      ref: "User",
    },
    googleCalendarReminderID: {
      type: String,
    },
    location: {
      type: String,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Reminder", userSchema);
