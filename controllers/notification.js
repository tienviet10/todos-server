const { json } = require("body-parser");
const Notification = require("../models/notification");

///// Get notifications for reminders, shared reminders, and friend request
exports.readNotifications = async (req, res) => {
  let resultList = [];

  // Friend Request
  try {
    const friendRequestNotification = await Notification.find({
      sharedWith: { $elemMatch: { $eq: req.auth._id } },
      status: "active",
      reminderTypes: "friendRequest",
    })
      .select("seen sharedWith postedBy reminderTypes createdAt")
      .populate("postedBy", "username picture email -_id")
      .sort({ createdAt: -1 });
    resultList = friendRequestNotification;
    //resultList = resultList.concat(friendRequestNotification);
  } catch (e) {
    console.log(e);
  }

  //// Shared reminders at the top of the notification
  try {
    const sharedReminderRequestNotification = await Notification.find({
      sharedWith: { $elemMatch: { $eq: req.auth._id } },
      status: "active",
      reminderTypes: "sharedReminderRequest",
    })
      .select(
        "seen sharedWith postedBy reminderTypes mainNotification title _id createdAt"
      )
      .populate("postedBy", "username picture email -_id")
      .sort({ createdAt: -1 });
    resultList = resultList.concat(sharedReminderRequestNotification);
    //resultList = sharedReminderRequestNotification;
  } catch (e) {
    console.log(e);
  }

  // Reminders and shared notification, organize according to the reminded time
  try {
    const reminderNotification = await Notification.find({
      sharedWith: { $elemMatch: { $eq: req.auth._id } },
      status: "active",
      remindedAt: {
        $gte: new Date(new Date().setHours(0, 0, 0)),
        $lt: new Date(new Date().setDate(new Date().getDate() + 2)),
        //$lt: new Date(new Date().setHours(23, 59, 59)),
      },
    })
      .select(
        "title reminderID remindedAt seen sharedWith postedBy reminderTypes createdAt"
      )
      .populate("sharedWith", "username picture -_id")
      .populate("postedBy", "username picture email -_id")
      .sort({ remindedAt: 1 });
    resultList = resultList.concat(reminderNotification);
  } catch (e) {
    console.log(e);
  }

  // resultList.sort((a, b) => b.createdAt - a.createdAt);

  res.json(resultList);
};

// Update notifications -> change status to true
exports.updateNotification = async (req, res) => {
  const { id } = req.params;

  Notification.findOneAndUpdate({ _id: id }, req.body).exec((err, updated) => {
    if (err) {
      return res.status(400).json({
        error:
          "Error finding and updating the notification with the given notification id",
      });
    }
    res.json(updated);
  });
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
