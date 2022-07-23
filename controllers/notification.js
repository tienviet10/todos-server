const { json } = require("body-parser");
const Notification = require("../models/notification");
const Reminder = require("../models/reminder");

exports.readNotifications = (req, res) => {
  Notification.find({
    sharedWith: { $elemMatch: { $eq: req.auth._id } },
    status: "active",
    remindedAt: {
      $gte: new Date(new Date().setHours(0, 0, 0)),
      $lt: new Date(new Date().setDate(new Date().getDate() + 2)),
      //$lt: new Date(new Date().setHours(23, 59, 59)),
    },
  })
    .select("title reminderID remindedAt seen sharedWith adminPhoto postedBy")
    .sort({ createdAt: -1 })
    .exec((err, data) => {
      if (err) {
        return res.status(400).json({
          error: "Cannot retrieve reminders",
        });
      }

      res.json(data);
    });
};

exports.updateNotification = async (req, res) => {
  const { id } = req.params;

  Notification.findOneAndUpdate({ reminderID: id }, req.body).exec(
    (err, updated) => {
      if (err) {
        return res.status(400).json({
          error: "Error finding the reminder",
        });
      }
      res.json(updated);
    }
  );
};

// exports.readAReminder = (req, res) => {
//   const { id } = req.params;

//   Reminder.findOne({ _id: id }).exec((err, updated) => {
//     if (err) {
//       return res.status(400).json({
//         error: "Error finding the reminder",
//       });
//     }
//     res.json(updated);
//   });
// };
