const { json } = require("body-parser");
const Reminder = require("../models/reminder");
const Notification = require("../models/notification");

exports.read = (req, res) => {
  Reminder.find({ postedBy: req.auth._id, status: "active" })
    .select(
      "title description status favorite color createdAt updatedAt remindedAt"
    )
    .sort({ remindedAt: 1 })
    .exec((err, data) => {
      if (err) {
        return res.status(400).json({
          error: "Cannot retrieve reminders",
        });
      }

      res.json(data);
    });
};

exports.readSevenDays = (req, res) => {
  Reminder.find({
    postedBy: req.auth._id,
    status: "active",
    remindedAt: {
      $gte: new Date(new Date().setHours(0, 0, 0)),
      $lt: new Date(new Date().setDate(new Date().getDate() + 7)),
      //$lt: new Date(new Date().setHours(23, 59, 59)),
    },
  })
    .select(
      "title description status favorite color createdAt updatedAt remindedAt"
    )
    .sort({ remindedAt: 1 })
    .exec((err, data) => {
      if (err) {
        return res.status(400).json({
          error: "Cannot retrieve reminders",
        });
      }

      res.json(data);
    });
};

exports.readInactive = (req, res) => {
  Reminder.find({ postedBy: req.auth._id, status: "deactive" })
    .select(
      "title description status favorite color createdAt updatedAt remindedAt"
    )
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

exports.deactivePastDue = (req, res) => {
  for (const reminder of req.body) {
    Reminder.findOne({ _id: reminder._id, postedBy: req.auth._id }).exec(
      (err, updated) => {
        if (err) {
          return res.status(400).json({
            error: "Error updating reminder",
          });
        }
        const newUpdate = {
          status: reminder.status,
          //remindedAt: null,
        };

        return updated.updateOne(newUpdate, (err, success) => {
          if (err) {
            return res.status(400).json({
              error: "Error updating reminder",
            });
          }

          Notification.findOneAndUpdate(
            { reminderID: reminder._id },
            {
              status: reminder.status,
              //remindedAt: null,
              seen: updated.status === "deactive" && false,
            },
            (err, success) => {
              if (err) {
                return res.status(400).json({
                  error: "Error updating reminder notification",
                });
              }
            }
          );
        });
      }
    );
  }
  res.json({
    message: "Successfully update due reminders",
  });
};

exports.create = (req, res) => {
  const reminder = new Reminder(req.body);
  reminder.postedBy = req.auth._id;

  reminder.save((err, data) => {
    if (err) {
      return res.status(400).json({
        error: "Reminder error occurred when saving to the database",
      });
    }
    const notification = new Notification({
      title: data.title,
      reminderID: data._id,
      remindedAt: data.remindedAt,
      seen: false,
      postedBy: data.postedBy,
      status: "active",
    });

    notification.save((err, notificationData) => {
      if (err) {
        return res.status(400).json({
          error:
            "Reminder error occurred when saving to the notification database",
        });
      }
      res.json({
        _id: data._id,
        title: data.title,
        description: data.description,
        status: data.status,
        favorite: data.favorite,
        color: data.color,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
        remindedAt: data.remindedAt,
      });
    });
  });
};

exports.remove = (req, res) => {
  const { id } = req.params;
  const postedByUser = req.auth._id;
  Reminder.findOneAndRemove({ _id: id, postedBy: postedByUser }).exec(
    (err, data) => {
      if (err) {
        return res.status(400).json({
          error: "Error removing the reminder",
        });
      }
      // if (data === null) {
      //   res.json({
      //     message: "Cannot find the requested reminder",
      //   });
      // } else {
      //   res.json({
      //     message: "Reminder removed successfully",
      //   });
      // }
      Notification.findOneAndRemove({ reminderID: id }).exec((err, data) => {
        if (err) {
          return res.status(400).json({
            error: "Error removing the notification reminder",
          });
        }

        res.json({
          message: "Reminder removed successfully",
        });
      });
    }
  );
};

exports.update = async (req, res) => {
  const { id } = req.params;

  Reminder.findOne({ _id: id, postedBy: req.auth._id }).exec((err, updated) => {
    if (err) {
      return res.status(400).json({
        error: "Error updating reminder",
      });
    }
    const newUpdate = {
      description: req.body.description,
      title: req.body.title,
      status: req.body.status,
      favorite: req.body.favorite,
      color: req.body.color,
      remindedAt: req.body.remindedAt,
    };

    return updated.updateOne(newUpdate, (err, success) => {
      if (err) {
        return res.status(400).json({
          error: "Error updating reminder",
        });
      }

      Notification.findOneAndUpdate(
        { reminderID: id },
        {
          title: req.body.title,
          remindedAt: req.body.remindedAt,
          status: req.body.status,
          seen: updated.status === "deactive" && false,
        },
        (err, success) => {
          if (err) {
            return res.status(400).json({
              error: "Error updating reminder notification",
            });
          }
          res.json({
            title: updated.title,
            description: updated.description,
            status: updated.status,
            favorite: updated.favorite,
            color: updated.color,
            remindedAt: updated.remindedAt,
            createdAt: updated.createdAt,
            updatedAt: updated.updatedAt,
          });
        }
      );
    });
  });
};

// exports.update = async (req, res) => {
//   const { id } = req.params;

//   Reminder.findOne({ _id: id }).exec((err, updated) => {
//     if (err) {
//       return res.status(400).json({
//         error: "Error finding the reminder",
//       });
//     }
//     if (updated.postedBy.equals(req.auth._id)) {
//       const newUpdate = {
//         description: req.body.description,
//         title: req.body.title,
//         status: req.body.status,
//         favorite: req.body.favorite,
//         color: req.body.color,
//         remindedAt: req.body.remindedAt,
//       };

//       return updated.updateOne(newUpdate, (err, success) => {
//         if (err) {
//           return res.status(400).json({
//             error: "Error updating reminder",
//           });
//         }

//         Notification.findOneAndUpdate(
//           { reminderID: id },
//           {
//             title: req.body.title,
//             remindedAt: req.body.remindedAt,
//             status: req.body.status,
//             seen: updated.status === "deactive" && false,
//           },
//           (err, success) => {
//             if (err) {
//               return res.status(400).json({
//                 error: "Error updating reminder notification",
//               });
//             }
//             res.json({
//               title: updated.title,
//               description: updated.description,
//               status: updated.status,
//               favorite: updated.favorite,
//               color: updated.color,
//               remindedAt: updated.remindedAt,
//               createdAt: updated.createdAt,
//               updatedAt: updated.updatedAt,
//             });
//           }
//         );
//       });
//     } else {
//       return res.status(400).json({
//         error: "Error processing update",
//       });
//     }
//   });
// };

exports.readAReminder = (req, res) => {
  const { id } = req.params;
  Reminder.findOne({ _id: id }).exec((err, updated) => {
    if (err) {
      return res.status(400).json({
        error: "Error finding the reminder",
      });
    }
    res.json(updated);
  });
};
