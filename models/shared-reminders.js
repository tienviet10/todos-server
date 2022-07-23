const mongoose = require("mongoose");
const { ObjectId } = mongoose.Schema;

const RolesUsersSchema = mongoose.Schema({
  admin: [String],
  editor: [String],
  viewer: [String],
});

const googleCalendarUserSchema = mongoose.Schema({
  userID: { type: String },
  googleCalID: { type: String },
});

const sharedReminderSchema = new mongoose.Schema(
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
    googleCalendarReminderID: [
      {
        type: googleCalendarUserSchema,
      },
    ],
    location: {
      type: String,
    },
    users: [
      {
        type: ObjectId,
        ref: "User",
      },
    ],
    groupUsers: {
      type: RolesUsersSchema,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("SharedReminder", sharedReminderSchema);
