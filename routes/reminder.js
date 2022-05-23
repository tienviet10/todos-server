const express = require("express");
const router = express.Router();

const { requireSignIn } = require("../controllers/auth");
const {
  create,
  remove,
  update,
  read,
  readInactive,
} = require("../controllers/reminder");
const { runValidation } = require("../validators");
const { reminderCheck } = require("../validators/reminder");

router.get("/v1/reminders/active", requireSignIn, read);

router.get("/v1/reminders/past", requireSignIn, readInactive);

router.post(
  "/v1/reminder",
  reminderCheck,
  runValidation,
  requireSignIn,
  create
);

router.put(
  "/v1/reminder/:id",
  reminderCheck,
  runValidation,
  requireSignIn,
  update
);

router.delete("/v1/reminder/:id", requireSignIn, remove);

module.exports = router;
