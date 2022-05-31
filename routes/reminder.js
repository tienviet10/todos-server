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
  deactivePastDue,
} = require("../controllers/reminder");
const { runValidation } = require("../validators");
const { reminderCheck } = require("../validators/reminder");

router.get("/v1/reminders/active", requireSignIn, read);

router.get("/v1/reminders/past", requireSignIn, readInactive);

router.put("/v1/reminders/past", requireSignIn, deactivePastDue);

router.get("/v1/reminders/seven-days-reminders", requireSignIn, readSevenDays);

router.get("/v1/reminder/:id", requireSignIn, readAReminder);

router.post(
  "/v1/reminder",
  reminderCheck,
  runValidation,
  requireSignIn,
  create
);

router.put("/v1/reminder/:id", requireSignIn, update);

router.delete("/v1/reminder/:id", requireSignIn, remove);

module.exports = router;
