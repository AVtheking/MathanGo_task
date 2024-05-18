import amqp from "amqplib";

export let channel = null;
export default async function connectRabbitMq() {
  try {
    const connection = await amqp.connect("amqp://localhost");
    channel = await connection.createChannel();
    channel.assertQueue("csv_parse_queue", {
      durable: false,
    });
    await channel.assertQueue("result_queue", { durable: false });
    console.log("\x1b[34mconnected to RabbitMQ \x1b[0m");
  } catch (error) {
    console.log(error.message);
  }
}
