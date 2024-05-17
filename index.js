import "dotenv/config";
import express from "express";
import mongoose from "mongoose";
import { errorMiddleware } from "./middlewares/error.js";
import { router as listRouter } from "./routes/list.js";
const app = express();

app.use(express.json());
// app.use(errorMiddleware);
app.use(express.urlencoded({ extended: false }));
app.use("/api/v1/list", listRouter, errorMiddleware);

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URL).then(() => {
  console.log("database is connected");
  app.listen(process.env.PORT, () => {
    console.log(`Server is running on port: ${process.env.PORT}`);
  });
});
