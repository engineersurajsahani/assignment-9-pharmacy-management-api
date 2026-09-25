require("dotenv").config({ quiet: true });

const express = require("express");
const cors = require("cors");
const path = require("path");
const connectDB = require("./config/db");
const authRoutes = require("./routes/authRoutes");
const medicineRoutes = require("./routes/medicineRoutes");
const orderRoutes = require("./routes/orderRoutes");
const reportRoutes = require("./routes/reportRoutes");
const app = express();

app.use(cors());
app.use(express.json());

app.get("/api", (request, response) => {
  response.status(200).json({ message: "connected" });
});

app.use("/api/auth", authRoutes);
app.use("/api/medicines", medicineRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/reports", reportRoutes);
app.use(express.static(path.join(__dirname, "public")));

app.use((request, response) => {
  response.status(404).json({ message: "Route not found" });
});

app.use((err, request, response, next) => {
  if (err.type === "entity.parse.failed") {
    return response.status(400).json({ message: "Invalid JSON body!" });
  }
  console.error(err);
  response.status(500).json({ message: "Something went wrong" });
});

const PORT = process.env.PORT || 3000;

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`server is running on port ${PORT}!!`);
  });
});
