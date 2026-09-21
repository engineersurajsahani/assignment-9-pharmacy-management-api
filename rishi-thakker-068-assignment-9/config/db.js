const mongoose = require("mongoose");

const MONGO_URI = "mongodb+srv://2025rishit_db_user:vPNGhLsvT7BgUAct@pharmacy.mamc0sx.mongodb.net/pharmacymgmt?retryWrites=true&w=majority&appName=pharmacy";

mongoose.connect(MONGO_URI);

const db = mongoose.connection;

db.on("connected", () => {
    console.log("Database connected successfully");
});

db.on("disconnected", () => {
    console.log("Database disconnected");
});

db.on("error", (error) => {
    console.log("Database connection error: ", error);
});

module.exports = db;
