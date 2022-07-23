const { json } = require("body-parser");
const Reminder = require("../models/reminder");
const Notification = require("../models/notification");
const { google } = require("googleapis");
const User = require("../models/user");
const SharedReminder = require("../models/shared-reminders");

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

exports.readSharedReminder = (req, res) => {
  SharedReminder.find({
    users: { $elemMatch: { $eq: req.auth._id } },
    status: "active",
  })
    .select(
      "title description status color createdAt updatedAt remindedAt repeat googleCalendarReminderID location users groupUsers"
    )
    .sort({ remindedAt: 1 })
    .exec((err, data) => {
      if (err) {
        return res.status(400).json({
          error: "Cannot retrieve shared reminders",
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
  Reminder.find({ postedBy: req.auth._id, status: "inactive" })
    .select(
      "title description status favorite color createdAt updatedAt remindedAt repeat googleCalendarReminderID location"
    )
    .sort({ createdAt: -1 })
    .exec((err, data) => {
      if (err) {
        return res.status(400).json({
          error: "Cannot retrieve inactive reminders",
        });
      }

      res.json(data);
    });
};

exports.readSharedInactive = (req, res) => {
  SharedReminder.find({ postedBy: req.auth._id, status: "inactive" })
    .select(
      "title description status favorite color createdAt updatedAt remindedAt repeat googleCalendarReminderID location users groupUsers"
    )
    .sort({ createdAt: -1 })
    .exec((err, data) => {
      if (err) {
        return res.status(400).json({
          error: "Cannot retrieve inactive reminders",
        });
      }

      res.json(data);
    });
};

exports.inactivePastDue = (req, res) => {
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
              seen: updated.status === "inactive" && false,
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

exports.inactivePastDueSharedReminders = (req, res) => {
  for (const sharedReminder of req.body) {
    SharedReminder.findOne({
      _id: sharedReminder._id,
      postedBy: req.auth._id,
    }).exec((err, updated) => {
      if (err) {
        return res.status(400).json({
          error: "Error updating shared reminder",
        });
      }
      const newUpdate = {
        status: sharedReminder.status,
      };

      return updated.updateOne(newUpdate, (err, success) => {
        if (err) {
          return res.status(400).json({
            error: "Error updating shared reminder",
          });
        }

        Notification.findOneAndUpdate(
          { reminderID: sharedReminder._id },
          {
            status: sharedReminder.status,
            seen: updated.status === "inactive" && false,
          },
          (err, success) => {
            if (err) {
              return res.status(400).json({
                error: "Error updating shared reminder notification",
              });
            }
          }
        );
      });
    });
  }
  res.json({
    message: "Successfully update due shared reminders",
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
          event.recurrence = [`RRULE:FREQ=${req.body.repeat};COUNT=12`];
        }

        try {
          responseGoogleCalendar = await calendar.events.insert({
            auth: oauth2Client,
            calendarId: "primary",
            requestBody: event,
          });
        } catch (e) {
          console.log("Was not able to create a google calendar event");
          //// If fails to use the refresh token, delete google related fields
          User.findOneAndUpdate(
            { _id: req.auth._id },
            {
              $unset: {
                refreshToken: "",
                accessToken: "",
                givenName: "",
                familyName: "",
                name: "",
                picture: "",
              },
            },
            (err, success) => {
              if (err) {
                console.log("error");
              }
              console.log("success");
            }
          );
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
          sharedReminder: false,
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

exports.removeSharedReminder = (req, res) => {
  const { id } = req.params;
  const postedByUser = req.auth._id;

  try {
    User.findOne({ _id: req.auth._id }).exec(async (err, user) => {
      if (err || !user) {
        return res.status(400).json({
          error: "User with that id does not exist.",
        });
      }

      SharedReminder.findOneAndRemove({ _id: id, postedBy: postedByUser }).exec(
        async (err, reminderData) => {
          if (err) {
            return res.status(400).json({
              error: "Error removing the reminder",
            });
          }

          // if (user.refreshToken && user.refreshToken !== "") {
          //   oauth2Client.setCredentials({ refresh_token: user.refreshToken });
          //   const calendar = google.calendar("v3");
          //   try {
          //     const responseGoogleCalendar = await calendar.events.delete({
          //       auth: oauth2Client,
          //       calendarId: "primary",
          //       eventId: reminderData.googleCalendarReminderID,
          //     });
          //   } catch (e) {
          //     console.log("No google calendar event to delete");
          //   }
          // }

          Notification.findOneAndRemove({ reminderID: id }).exec(
            (err, notificationData) => {
              if (err) {
                return res.status(400).json({
                  error: "Error removing the notification reminder",
                });
              }

              res.json({
                // googleReminderID: reminderData.googleCalendarReminderID
                //   ? reminderData.googleCalendarReminderID
                //   : "",
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
              event.recurrence = [`RRULE:FREQ=${req.body.repeat};COUNT=12`];
            }

            try {
              if (
                req.body.status === "active" &&
                updated.status === "inactive"
              ) {
                responseGoogleCalendar = await calendar.events.insert({
                  auth: oauth2Client,
                  calendarId: "primary",
                  requestBody: event,
                });
              } else if (
                req.body.status === "inactive" &&
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

          // Only Run when status change from inactive to active (move from past reminder to current reminder)
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
                seen: updated.status === "inactive" && false,
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

exports.updateSharedReminder = async (req, res) => {
  const { id } = req.params;

  try {
    SharedReminder.findOne({ _id: id, postedBy: req.auth._id }).exec(
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

          // let responseGoogleCalendar;
          // if (
          //   user.refreshToken &&
          //   user.refreshToken !== "" &&
          //   req.body.remindedAt !== null
          // ) {
          //   oauth2Client.setCredentials({ refresh_token: user.refreshToken });
          //   const calendar = google.calendar("v3");

          //   const endTime = new Date(req.body.remindedAt);
          //   const event = {
          //     summary: req.body.title,
          //     description: req.body.description,
          //     colorId: "7",
          //     start: {
          //       dateTime: req.body.remindedAt.replace("Z", "+00:00"),
          //       timeZone: req.body.location,
          //     },
          //     end: {
          //       dateTime: new Date(endTime.setMinutes(endTime.getMinutes() + 5))
          //         .toISOString()
          //         .replace("Z", "+00:00"),
          //       timeZone: req.body.location,
          //     },
          //     reminders: {
          //       useDefault: false,
          //       overrides: [{ method: "popup", minutes: 1 }],
          //     },
          //   };
          //   if (req.body.repeat && req.body.repeat !== "none") {
          //     event.recurrence = [`RRULE:FREQ=${req.body.repeat};COUNT=12`];
          //   }

          //   try {
          //     if (
          //       req.body.status === "active" &&
          //       updated.status === "inactive"
          //     ) {
          //       responseGoogleCalendar = await calendar.events.insert({
          //         auth: oauth2Client,
          //         calendarId: "primary",
          //         requestBody: event,
          //       });
          //     } else if (
          //       req.body.status === "inactive" &&
          //       updated.status === "active"
          //     ) {
          //       responseGoogleCalendar = await calendar.events.delete({
          //         auth: oauth2Client,
          //         calendarId: "primary",
          //         eventId: updated.googleCalendarReminderID,
          //       });
          //     } else {
          //       responseGoogleCalendar = await calendar.events.update({
          //         auth: oauth2Client,
          //         calendarId: "primary",
          //         eventId: updated.googleCalendarReminderID,
          //         requestBody: event,
          //       });
          //     }
          //   } catch (e) {
          //     console.log("Was not able to edit a google calendar event");
          //   }
          // }

          const newUpdate = {
            description: req.body.description,
            title: req.body.title,
            status: req.body.status,
            favorite: req.body.favorite,
            color: req.body.color,
            remindedAt: req.body.remindedAt,
            repeat: req.body.repeat,
          };

          // // Only Run when status change from inactive to active (move from past reminder to current reminder)
          // if (
          //   responseGoogleCalendar &&
          //   responseGoogleCalendar.status &&
          //   responseGoogleCalendar.data.id
          // ) {
          //   newUpdate.googleCalendarReminderID = responseGoogleCalendar.data.id;
          // }

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
                seen: updated.status === "inactive" && false,
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
              seen: updated.status === "inactive" && false,
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

exports.updateAllSharedReminders = async (req, res) => {
  for (const sharedReminder of req.body) {
    SharedReminder.findOne({
      _id: sharedReminder._id,
      postedBy: req.auth._id,
    }).exec((err, updated) => {
      if (err) {
        return res.status(400).json({
          error: "Error updating shared reminder",
        });
      }
      const newUpdate = {
        remindedAt: sharedReminder.remindedAt,
      };

      return updated.updateOne(newUpdate, (err, success) => {
        if (err) {
          return res.status(400).json({
            error: "Error updating shared reminder",
          });
        }

        Notification.findOneAndUpdate(
          { reminderID: sharedReminder._id },
          {
            remindedAt: sharedReminder.remindedAt,
            seen: updated.status === "inactive" && false,
          },
          (err, success) => {
            if (err) {
              return res.status(400).json({
                error: "Error updating shared reminder notification",
              });
            }
          }
        );
      });
    });
  }
  res.json({
    message: "Successfully update due shared reminders",
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

exports.createSharedReminder = (req, res) => {
  try {
    //Get user to get refresh_token for google calendar
    User.findOne({ _id: req.auth._id }).exec(async (err, user) => {
      if (err || !user) {
        return res.status(400).json({
          error: "User with that id does not exist.",
        });
      }

      // //If token exists, send correct event to the google calendar
      // let responseGoogleCalendar;

      // if (user.refreshToken && user.refreshToken !== "") {
      //   oauth2Client.setCredentials({ refresh_token: user.refreshToken });
      //   const calendar = google.calendar("v3");

      //   const endTime = new Date(req.body.remindedAt);
      //   const event = {
      //     summary: req.body.title,
      //     description: req.body.description,
      //     colorId: "7",
      //     start: {
      //       dateTime: req.body.remindedAt.replace("Z", "+00:00"),
      //       timeZone: req.body.location,
      //     },
      //     end: {
      //       dateTime: new Date(endTime.setMinutes(endTime.getMinutes() + 5))
      //         .toISOString()
      //         .replace("Z", "+00:00"),
      //       timeZone: req.body.location,
      //     },
      //     reminders: {
      //       useDefault: false,
      //       overrides: [{ method: "popup", minutes: 1 }],
      //     },
      //   };

      //   if (req.body.repeat && req.body.repeat !== "none") {
      //     event.recurrence = [`RRULE:FREQ=${req.body.repeat};COUNT=12`];
      //   }

      //   try {
      //     responseGoogleCalendar = await calendar.events.insert({
      //       auth: oauth2Client,
      //       calendarId: "primary",
      //       requestBody: event,
      //     });
      //   } catch (e) {
      //     console.log("Was not able to create a google calendar event");
      //     //// If fails to use the refresh token, delete google related fields
      //     User.findOneAndUpdate(
      //       { _id: req.auth._id },
      //       {
      //         $unset: {
      //           refreshToken: "",
      //           accessToken: "",
      //           givenName: "",
      //           familyName: "",
      //           name: "",
      //           picture: "",
      //         },
      //       },
      //       (err, success) => {
      //         if (err) {
      //           console.log("error");
      //         }
      //         console.log("success");
      //       }
      //     );
      //   }
      // }

      //Assemble reminder to save to mongoDB
      const sharedReminder = new SharedReminder(req.body);
      console.log(sharedReminder);
      sharedReminder.postedBy = req.auth._id;
      sharedReminder.users = [req.auth._id];
      sharedReminder.groupUsers = {
        admin: [req.auth._id],
        editor: [],
        viewer: [],
      };

      // //Add google reminder ID that was added to google
      // if (
      //   responseGoogleCalendar &&
      //   responseGoogleCalendar.status &&
      //   responseGoogleCalendar.data.id
      // ) {
      //   reminder.googleCalendarReminderID = responseGoogleCalendar.data.id;
      // }

      //Save reminder to mongoDB
      sharedReminder.save((err, data) => {
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
          sharedWith: [req.auth._id],
          sharedReminder: true,
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
      error: "Error creating shared event",
    });
  }
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
