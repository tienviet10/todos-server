const express = require("express");
const app = express();
const helmet = require("helmet");
var dbconnection = require("./db");
const morgan = require("morgan");
const cors = require("cors");
const bodyParser = require("body-parser");
require("dotenv").config();

// app.get("/", (req, res) => {
//   res.send("this is from backend");
// });

// app middleware
app.use(morgan("dev"));
app.use(bodyParser.json({ limit: "5mb", type: "application/json" }));
app.use(cors({ origin: process.env.CLIENT_URL }));
app.use(helmet());

const authRoutes = require("./routes/auth");
app.use("/api", authRoutes);
const reminderRoute = require("./routes/reminder");
app.use("/api", reminderRoute);

const port = process.env.PORT || 8000;
app.listen(port, () => console.log(`API is running on port ${port}`));
