import amqp from "amqplib";
import "dotenv/config";
import { EMAIL_QUEUE } from "../utils/constants.js";
import { emailBody } from "../utils/emailBody.js";
import { sendMail } from "../utils/mailer.js";
export async function startEmailWorker() {
  try {
    const connection = await amqp.connect("amqp://localhost");
    const channel = await connection.createChannel();
    await channel.assertQueue(EMAIL_QUEUE, { durable: false });
    channel.consume(
      EMAIL_QUEUE,
      async (msg) => {
        if (msg) {
          console.log(
            "\x1b[31m........Message recieved in Email queue........ \x1b[0m"
          );
          const { usersToSend, listId } = JSON.parse(msg.content.toString());

          usersToSend.forEach((user) => {
            const unsubscribeUrl = `${process.env.BASE_URL}/api/list/${listId}/unsubscribe/${user._id}`;

            const customPropertiy = user.customProperties.find(
              (prop) => prop.title === "city"
            );

            const personalizedEmailBody = emailBody(unsubscribeUrl)
              .replace("[name]", user.name)
              .replace("[email]", user.email)
              .replace("[city]", customPropertiy.value);
            sendMail(user.email, "Welcome to MathonGo", personalizedEmailBody);
          });
        }
        channel.ack(msg);
      },
      {
        noAck: false,
      }
    );
  } catch (error) {
    console.log(error.message);
  }
}
