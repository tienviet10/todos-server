const express = require("express");
const app = express();
const helmet = require("helmet");
var dbconnection = require("./db");
const morgan = require("morgan");
const cors = require("cors");
const bodyParser = require("body-parser");
require("dotenv").config();

// app middleware
app.use(morgan("dev"));
app.use(bodyParser.json({ limit: "5mb", type: "application/json" }));
app.use(cors({ origin: "*" }));
app.use(helmet());

const authRoutes = require("./routes/auth");
app.use("/api", authRoutes);
const reminderRoute = require("./routes/reminder");
app.use("/api", reminderRoute);
const notificationRoute = require("./routes/notification");
app.use("/api", notificationRoute);

const port = process.env.PORT || 8000;
app.listen(port, () => console.log(`API is running on port ${port}`));
