const express = require("express");
const cors = require("cors");
const session = require("express-session");
// const mongoose = require("mongoose");
const connectDB = require('./config/database');
const AuthRouter = require("./routes/AuthRoute.js");
const SettingsRouter = require("./controllers/Settingscontroller.js");
require("dotenv").config();

const app = express();

// Enable CORS

// app.use(cors());
app.use(cors({
  origin: 'http://localhost:5173',
  methods: ['GET', 'POST', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  // allowedHeaders: ['Content-Type', 'Authorization']
}));

// Middleware
app.use(express.json());


app.use(express.urlencoded({ extended: true }));

// Database connection
connectDB();


app.use(
  session({
    secret: "mysecretkey",
    resave: false,
    saveUninitialized: false,
  })
);

// Routes

app.use("/", AuthRouter);
app.use("/api/settings", SettingsRouter);

app.get("/", (req, res) => {
  res.send("Bank API is running");
});

module.exports = app;
