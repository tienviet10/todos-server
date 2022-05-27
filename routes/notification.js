const express = require("express");
const router = express.Router();

const { requireSignIn } = require("../controllers/auth");
const {
  readNotifications,
  updateNotification,
  //readAReminder,
} = require("../controllers/notification");

router.get("/v1/notifications", requireSignIn, readNotifications);
router.put("/v1/notification/:id", requireSignIn, updateNotification);
//router.get("/v1/notification/:id", requireSignIn, readAReminder);

module.exports = router;
