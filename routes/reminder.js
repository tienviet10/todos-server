const express = require("express");
const router = express.Router();

const { requireSignIn } = require("../controllers/auth");
const {
  create,
  remove,
  update,
  read,
  readInactive,
  readAReminder,
  readSevenDays,
  inactivePastDue,
  updateAll,
  createSharedReminder,
  readSharedReminder,
  updateAllSharedReminders,
  inactivePastDueSharedReminders,
  updateSharedReminder,
  removeSharedReminder,
  readSharedInactive,
} = require("../controllers/reminder");

const { runValidation } = require("../validators");
const {
  reminderCheck,
  sharedReminderCheck,
} = require("../validators/reminder");

router.get("/v1/reminders/active", requireSignIn, read);

router.get("/v1/reminders/past", requireSignIn, readInactive);

router.put("/v1/reminders/past", requireSignIn, inactivePastDue);

router.get("/v1/reminders/seven-days-reminders", requireSignIn, readSevenDays);

router.put("/v1/reminders", requireSignIn, updateAll);

router.post(
  "/v1/reminder",
  reminderCheck,
  runValidation,
  requireSignIn,
  create
);

router.put("/v1/reminder/:id", requireSignIn, update);

router.delete("/v1/reminder/:id", requireSignIn, remove);

router.get("/v1/reminder/:id", requireSignIn, readAReminder);

router.post(
  "/v1/shared-reminder",
  sharedReminderCheck,
  runValidation,
  requireSignIn,
  createSharedReminder
);

router.get("/v1/shared-reminders/active", requireSignIn, readSharedReminder);

router.put("/v1/shared-reminders", requireSignIn, updateAllSharedReminders);

router.put(
  "/v1/shared-reminders/past",
  requireSignIn,
  inactivePastDueSharedReminders
);

router.put("/v1/shared-reminder/:id", requireSignIn, updateSharedReminder);

router.delete("/v1/shared-reminder/:id", requireSignIn, removeSharedReminder);

router.get("/v1/shared-reminders/past", requireSignIn, readSharedInactive);

module.exports = router;
