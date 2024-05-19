import amqp from "amqplib";
import {
  CSV_PARSE_QUEUE,
  EMAIL_QUEUE,
  RESULT_QUEUE,
  UNSUBSCRIBE_QUEUE,
} from "./constants.js";

export let channel = null;
export default async function connectRabbitMq() {
  try {
    const connection = await amqp.connect("amqp://localhost");
    channel = await connection.createChannel();
    await channel.assertQueue(CSV_PARSE_QUEUE, {
      durable: true,
    });

    await channel.assertQueue(EMAIL_QUEUE, { durable: false });
    await channel.assertQueue(UNSUBSCRIBE_QUEUE, { durable: true });

    console.log("\x1b[34mconnected to RabbitMQ \x1b[0m");
  } catch (error) {
    console.log(error.message);
  }
}
