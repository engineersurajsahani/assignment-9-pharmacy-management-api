const express = require("express");
require("./config/db");
const logger = require("./middleware/requestLogger");
const router = require("./router/router");

const app = express();

app.use(express.json());
app.use(logger);

app.get("/", (req, res) => {
  res.status(200).json({ message: "Welcome to Pharmacy & Healthcare Store API" });
});

app.use("/api", router);

app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

const PORT = 4000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
