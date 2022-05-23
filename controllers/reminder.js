const { json } = require("body-parser");
const Reminder = require("../models/reminder");

exports.read = (req, res) => {
  Reminder.find({ postedBy: req.auth._id, status: "active" })
    .select("title description status favorite color createdAt updatedAt")
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

exports.readInactive = (req, res) => {
  Reminder.find({ postedBy: req.auth._id, status: "deactive" })
    .select("title description status favorite color createdAt updatedAt")
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

exports.create = (req, res) => {
  let reminder = new Reminder(req.body);
  reminder.postedBy = req.auth._id;
  reminder.save((err, data) => {
    if (err) {
      return res.status(400).json({
        error: "Reminder error occured when saving to the database",
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
      if (data === null) {
        res.json({
          message: "Cannot find the requested reminder",
        });
      } else {
        res.json({
          message: "Reminder removed successfully",
        });
      }
    }
  );
};

exports.update = async (req, res) => {
  const { id } = req.params;

  Reminder.findOne({ _id: id }).exec((err, updated) => {
    if (err) {
      return res.status(400).json({
        error: "Error finding the reminder",
      });
    }
    if (updated.postedBy.equals(req.auth._id)) {
      let newUpdate = {
        description: req.body.description,
        title: req.body.title,
        status: req.body.status,
        favorite: req.body.favorite,
        color: req.body.color,
      };

      return updated.updateOne(newUpdate, (err, success) => {
        if (err) {
          return res.status(400).json({
            error: "Error updating reminder",
          });
        }
        res.json({
          title: newUpdate.title,
          description: newUpdate.description,
          status: newUpdate.status,
          favorite: newUpdate.favorite,
          color: newUpdate.color,
          createdAt: updated.createdAt,
          updatedAt: updated.updatedAt,
        });
      });
    } else {
      return res.status(400).json({
        error: "Error processing update",
      });
    }
  });
};
