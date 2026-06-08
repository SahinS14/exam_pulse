const mongoose = require("mongoose");

const connectDB = async () => {
  const mongoUri = process.env.MONGO_URI?.trim();

  if (!mongoUri) {
    throw new Error("MONGO_URI is required");
  }

  mongoose.connection.on("error", (error) => {
    console.error("MongoDB connection error", error.message);
    process.exit(1);
  });

  mongoose.connection.on("disconnected", () => {
    console.error("MongoDB disconnected");
    process.exit(1);
  });

  await mongoose.connect(mongoUri);
  console.log("MongoDB connected");
};

module.exports = connectDB;
