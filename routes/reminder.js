const express = require("express");
const router = express.Router();

const { requireSignin } = require("../controllers/auth");
const {
  create,
  remove,
  update,
  read,
  readInactive,
} = require("../controllers/reminder");
const { runValidation } = require("../validators");
const { reminderCheck } = require("../validators/reminder");

router.get("/getmainreminders", requireSignin, read);

router.get("/getpastreminders", requireSignin, readInactive);

router.post(
  "/addreminder",
  reminderCheck,
  runValidation,
  requireSignin,
  create
);

router.put(
  "/editreminder/:id",
  reminderCheck,
  runValidation,
  requireSignin,
  update
);

router.delete("/deletereminder/:id", requireSignin, remove);

module.exports = router;
