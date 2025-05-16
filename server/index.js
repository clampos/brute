const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Test route
app.get("/", (req, res) => {
  res.send("Backend is running 🎉");
});

// Stripe or Auth routes will go here later

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
