const { json } = require("body-parser");
const Reminder = require("../models/reminder");
const Notification = require("../models/notification");
const { google } = require("googleapis");
const User = require("../models/user");

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.CLIENT_URL
);

const REFRESH_TOKEN =
  "1//04ND2QR9UTeYfCgYIARAAGAQSNwF-L9IrpD0hZ9E8qXHPdXJpZpqEvWv9_8K5IyRJSqxfalEpLq-GV4G8OLntmvcaL6bDabaUMDM";

exports.read = (req, res) => {
  Reminder.find({ postedBy: req.auth._id, status: "active" })
    .select(
      "title description status favorite color createdAt updatedAt remindedAt repeat"
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
        repeat: data.repeat,
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
      repeat: req.body.repeat,
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
            repeat: updated.repeat,
          });
        }
      );
    });
  });
};

exports.updateAll = async (req, res) => {
  for (const reminder of req.body) {
    Reminder.findOne({ _id: reminder._id, postedBy: req.auth._id }).exec(
      (err, updated) => {
        if (err) {
          return res.status(400).json({
            error: "Error updating reminder",
          });
        }
        const newUpdate = {
          remindedAt: reminder.remindedAt,
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
              remindedAt: reminder.remindedAt,
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

exports.createAnEvent = async (req, res) => {
  try {
    const { summary, description, location, startTime, endTime, recurrence } =
      req.body;

    User.findOne({ _id: req.auth._id }).exec(async (err, user) => {
      if (err || !user) {
        return res.status(400).json({
          error: "User with that id does not exist.",
        });
      }
      oauth2Client.setCredentials({ refresh_token: user.refreshToken });
      const calendar = google.calendar("v3");

      const event = {
        summary: summary,
        description: description,
        colorId: "7",
        start: {
          dateTime: startTime,
          timeZone: location,
        },
        end: {
          dateTime: endTime,
          timeZone: location,
        },
        reminders: {
          useDefault: false,
          overrides: [{ method: "popup", minutes: 1 }],
        },
      };
      if (recurrence && recurrence !== "none") {
        event["recurrence"] = [`RRULE:FREQ=${recurrence};COUNT=4`];
      }

      const response = await calendar.events.insert({
        auth: oauth2Client,
        calendarId: "primary",
        requestBody: event,
      });

      res.send(response);
    });
  } catch (error) {
    return res.status(400).json({
      error: "Error creating event",
    });
  }
};

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
