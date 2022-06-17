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

exports.read = (req, res) => {
  Reminder.find({ postedBy: req.auth._id, status: "active" })
    .select(
      "title description status favorite color createdAt updatedAt remindedAt repeat googleCalendarReminderID location"
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
          error: "Cannot retrieve seven-day reminders",
        });
      }

      res.json(data);
    });
};

exports.readInactive = (req, res) => {
  Reminder.find({ postedBy: req.auth._id, status: "deactive" })
    .select(
      "title description status favorite color createdAt updatedAt remindedAt repeat googleCalendarReminderID location"
    )
    .sort({ createdAt: -1 })
    .exec((err, data) => {
      if (err) {
        return res.status(400).json({
          error: "Cannot retrieve deactive reminders",
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
  try {
    //Get user to get refresh_token for google calendar
    User.findOne({ _id: req.auth._id }).exec(async (err, user) => {
      if (err || !user) {
        return res.status(400).json({
          error: "User with that id does not exist.",
        });
      }

      //If token exists, send correct event to the google calendar
      let responseGoogleCalendar;

      if (user.refreshToken && user.refreshToken !== "") {
        oauth2Client.setCredentials({ refresh_token: user.refreshToken });
        const calendar = google.calendar("v3");

        const endTime = new Date(req.body.remindedAt);
        const event = {
          summary: req.body.title,
          description: req.body.description,
          colorId: "7",
          start: {
            dateTime: req.body.remindedAt.replace("Z", "+00:00"),
            timeZone: req.body.location,
          },
          end: {
            dateTime: new Date(endTime.setMinutes(endTime.getMinutes() + 5))
              .toISOString()
              .replace("Z", "+00:00"),
            timeZone: req.body.location,
          },
          reminders: {
            useDefault: false,
            overrides: [{ method: "popup", minutes: 1 }],
          },
        };

        if (req.body.repeat && req.body.repeat !== "none") {
          event.recurrence = [`RRULE:FREQ=${req.body.repeat};COUNT=4`];
        }

        try {
          responseGoogleCalendar = await calendar.events.insert({
            auth: oauth2Client,
            calendarId: "primary",
            requestBody: event,
          });
        } catch (e) {
          console.log("Was not able to create a google calendar event");
        }
      }

      //Assemble reminder to save to mongoDB
      const reminder = new Reminder(req.body);
      reminder.postedBy = req.auth._id;

      //Add google reminder ID that was added to google
      if (
        responseGoogleCalendar &&
        responseGoogleCalendar.status &&
        responseGoogleCalendar.data.id
      ) {
        reminder.googleCalendarReminderID = responseGoogleCalendar.data.id;
      }

      //Save reminder to mongoDB
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

        //Save notification to mongoDB
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
    });
  } catch (error) {
    return res.status(400).json({
      error: "Error creating event",
    });
  }
};

exports.remove = (req, res) => {
  const { id } = req.params;
  const postedByUser = req.auth._id;

  try {
    User.findOne({ _id: req.auth._id }).exec(async (err, user) => {
      if (err || !user) {
        return res.status(400).json({
          error: "User with that id does not exist.",
        });
      }

      Reminder.findOneAndRemove({ _id: id, postedBy: postedByUser }).exec(
        async (err, reminderData) => {
          if (err) {
            return res.status(400).json({
              error: "Error removing the reminder",
            });
          }

          if (user.refreshToken && user.refreshToken !== "") {
            oauth2Client.setCredentials({ refresh_token: user.refreshToken });
            const calendar = google.calendar("v3");
            try {
              const responseGoogleCalendar = await calendar.events.delete({
                auth: oauth2Client,
                calendarId: "primary",
                eventId: reminderData.googleCalendarReminderID,
              });
            } catch (e) {
              console.log("No google calendar event to delete");
            }
          }

          Notification.findOneAndRemove({ reminderID: id }).exec(
            (err, notificationData) => {
              if (err) {
                return res.status(400).json({
                  error: "Error removing the notification reminder",
                });
              }

              res.json({
                googleReminderID: reminderData.googleCalendarReminderID
                  ? reminderData.googleCalendarReminderID
                  : "",
                message: "Reminder removed successfully",
              });
            }
          );
        }
      );
    });
  } catch (error) {
    return res.status(400).json({
      error: "Error deleting a google calendar event",
    });
  }
};

exports.update = async (req, res) => {
  const { id } = req.params;

  try {
    Reminder.findOne({ _id: id, postedBy: req.auth._id }).exec(
      (err, updated) => {
        if (err) {
          return res.status(400).json({
            error: "Error finding the reminder",
          });
        }

        User.findOne({ _id: req.auth._id }).exec(async (err, user) => {
          if (err || !user) {
            return res.status(400).json({
              error: "User with that id does not exist.",
            });
          }

          let responseGoogleCalendar;
          if (
            user.refreshToken &&
            user.refreshToken !== "" &&
            req.body.remindedAt !== null
          ) {
            oauth2Client.setCredentials({ refresh_token: user.refreshToken });
            const calendar = google.calendar("v3");

            const endTime = new Date(req.body.remindedAt);
            const event = {
              summary: req.body.title,
              description: req.body.description,
              colorId: "7",
              start: {
                dateTime: req.body.remindedAt.replace("Z", "+00:00"),
                timeZone: req.body.location,
              },
              end: {
                dateTime: new Date(endTime.setMinutes(endTime.getMinutes() + 5))
                  .toISOString()
                  .replace("Z", "+00:00"),
                timeZone: req.body.location,
              },
              reminders: {
                useDefault: false,
                overrides: [{ method: "popup", minutes: 1 }],
              },
            };
            if (req.body.repeat && req.body.repeat !== "none") {
              event.recurrence = [`RRULE:FREQ=${req.body.repeat};COUNT=4`];
            }

            try {
              if (
                req.body.status === "active" &&
                updated.status === "deactive"
              ) {
                responseGoogleCalendar = await calendar.events.insert({
                  auth: oauth2Client,
                  calendarId: "primary",
                  requestBody: event,
                });
              } else if (
                req.body.status === "deactive" &&
                updated.status === "active"
              ) {
                responseGoogleCalendar = await calendar.events.delete({
                  auth: oauth2Client,
                  calendarId: "primary",
                  eventId: updated.googleCalendarReminderID,
                });
              } else {
                responseGoogleCalendar = await calendar.events.update({
                  auth: oauth2Client,
                  calendarId: "primary",
                  eventId: updated.googleCalendarReminderID,
                  requestBody: event,
                });
              }
            } catch (e) {
              console.log("Was not able to edit a google calendar event");
            }
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

          // Only Run when status change from deactive to active (move from past reminder to current reminder)
          if (
            responseGoogleCalendar &&
            responseGoogleCalendar.status &&
            responseGoogleCalendar.data.id
          ) {
            newUpdate.googleCalendarReminderID = responseGoogleCalendar.data.id;
          }

          //Update fields of the reminder
          updated.updateOne(newUpdate, (err, success) => {
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
      }
    );
  } catch (error) {
    return res.status(400).json({
      error: "Error creating event",
    });
  }
};

exports.editAnEvent = async (req, res) => {
  try {
    const {
      summary,
      description,
      location,
      startTime,
      endTime,
      recurrence,
      reminderID,
    } = req.body;

    User.findOne({ _id: req.auth._id }).exec(async (err, user) => {
      if (err || !user) {
        return res.status(400).json({
          error: "User with that id does not exist.",
        });
      }

      oauth2Client.setCredentials({ refresh_token: user.refreshToken });
      const calendar = google.calendar("v3");

      Reminder.findOne({ _id: reminderID }).exec(async (err, updated) => {
        if (err) {
          return res.status(400).json({
            error: "Error updating reminder",
          });
        }

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
        try {
          const response = await calendar.events.update({
            auth: oauth2Client,
            calendarId: "primary",
            eventId: updated.googleCalendarReminderID,
            requestBody: event,
          });
          res.send(response);
        } catch (e) {
          console.log("Was not able to update a google calendar event");
        }
      });
    });
  } catch (error) {
    return res.status(400).json({
      error: "Error creating event",
    });
  }
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

// exports.createAnEvent = async (req, res) => {
//   try {
//     const {
//       summary,
//       description,
//       location,
//       startTime,
//       endTime,
//       recurrence,
//       reminderID,
//     } = req.body;

//     User.findOne({ _id: req.auth._id }).exec(async (err, user) => {
//       if (err || !user) {
//         return res.status(400).json({
//           error: "User with that id does not exist.",
//         });
//       }
//       oauth2Client.setCredentials({ refresh_token: user.refreshToken });
//       const calendar = google.calendar("v3");

//       const event = {
//         summary: summary,
//         description: description,
//         colorId: "7",
//         start: {
//           dateTime: startTime,
//           timeZone: location,
//         },
//         end: {
//           dateTime: endTime,
//           timeZone: location,
//         },
//         reminders: {
//           useDefault: false,
//           overrides: [{ method: "popup", minutes: 1 }],
//         },
//       };
//       if (recurrence && recurrence !== "none") {
//         event["recurrence"] = [`RRULE:FREQ=${recurrence};COUNT=4`];
//       }

//       const response = await calendar.events.insert({
//         auth: oauth2Client,
//         calendarId: "primary",
//         requestBody: event,
//       });

//       if (response.status) {
//         Reminder.findOneAndUpdate(
//           { _id: reminderID },
//           {
//             googleCalendarReminderID: response.data.id,
//           },
//           (err, success) => {
//             if (err) {
//               return res.status(400).json({
//                 error: "Error updating reminder notification",
//               });
//             }
//             res.send(response);
//           }
//         );
//       }
//     });
//   } catch (error) {
//     return res.status(400).json({
//       error: "Error creating event",
//     });
//   }
// };

// exports.deleteAnEvent = (req, res) => {
//   const { id } = req.params;

//   try {
//     User.findOne({ _id: req.auth._id }).exec(async (err, user) => {
//       if (err || !user) {
//         return res.status(400).json({
//           error: "User with that id does not exist.",
//         });
//       }

//       oauth2Client.setCredentials({ refresh_token: user.refreshToken });
//       const calendar = google.calendar("v3");

//       const response = await calendar.events.delete({
//         auth: oauth2Client,
//         calendarId: "primary",
//         eventId: id,
//       });

//       res.send(response);
//     });
//   } catch (error) {
//     return res.status(400).json({
//       error: "Error deleting a google calendar event",
//     });
//   }
// };
