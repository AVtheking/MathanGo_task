import amqp from "amqplib";
import { User } from "../models/user.js";
import { UNSUBSCRIBE_QUEUE } from "../utils/constants.js";

export async function startUnsubscribeWorker() {
  const connection = await amqp.connect("amqp://localhost");
  const channel = await connection.createChannel();
  await channel.assertQueue(UNSUBSCRIBE_QUEUE, { durable: true });
  channel.consume(UNSUBSCRIBE_QUEUE, async (msg) => {
    if (msg) {
      console.log(
        "\x1b[31m........Message recieved in Unsubscribe queue........ \x1b[0m"
      );
      const { userId, listId } = JSON.parse(msg.content.toString());
      await User.findByIdAndUpdate(
        userId,
        {
          $push: { unsubscribedLists: new mongoose.Types.ObjectId(listId) },
        },
        {
          new: true,
        }
      );
    }
  });
}
