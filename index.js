import "dotenv/config";
import express from "express";
import mongoose from "mongoose";
import { errorMiddleware } from "./middlewares/error.js";
import { router as listRouter } from "./routes/list.js";
import connectRabbitMq from "./utils/connectRabbitMq.js";
import { startCSVWorker } from "./workers/csv_worker.js";
import { startEmailWorker } from "./workers/email_worker.js";
import { startUnsubscribeWorker } from "./workers/unsubscribe_worker.js";
const app = express();

app.use(express.json());

app.use(express.urlencoded({ extended: false }));
app.use("/api/list", listRouter, errorMiddleware);

app.get("/", (req, res) => {
  res.send("Service is running");
});
// Connect to MongoDB
mongoose.connect(process.env.MONGO_URL).then(async () => {
  console.log("\x1b[33mDatabase connected successfully \x1b[0m");

  app.listen(process.env.PORT, () => {
    console.log(
      `\x1b[32mServer is running on port: ${process.env.PORT} \x1b[0m`
    );
    // Connect to RabbitMQ broker server
    connectRabbitMq();

    //starting workers
    startCSVWorker();
    startEmailWorker();
    startUnsubscribeWorker();
  });
});
