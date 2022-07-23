const { check } = require("express-validator");

exports.reminderCheck = [
  // check("name").not().isEmpty().withMessage("Name is required"),
  check("title").not().isEmpty().withMessage("Title is required"),
  check("description").not().isEmpty().withMessage("Description is required"),
  check("status").not().isEmpty().withMessage("Status is required"),
  check("favorite").not().isEmpty().withMessage("Favorite is required"),
];

exports.sharedReminderCheck = [
  // check("name").not().isEmpty().withMessage("Name is required"),
  check("title").not().isEmpty().withMessage("Title is required"),
  check("description").not().isEmpty().withMessage("Description is required"),
  check("status").not().isEmpty().withMessage("Status is required"),
];
