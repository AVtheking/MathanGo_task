import amqp from "amqplib";
import { createObjectCsvStringifier } from "csv-writer";
import { User } from "../models/user.js";
import { CSV_PARSE_QUEUE } from "../utils/constants.js";

export async function startCSVWorker() {
  const connection = await amqp.connect("amqp://localhost");
  const channel = await connection.createChannel();

  channel.consume(
    CSV_PARSE_QUEUE,
    async (msg) => {
      if (msg) {
        console.log("\x1b[31m........Message recieved........ \x1b[0m");
        const { list, rows } = JSON.parse(msg.content.toString());

        const users = [];
        const invalidUsers = [];

        for (const row of rows) {
          try {
            if (!row.name.trim() || !row.email.trim()) {
              row.error = "Name and email are required";
              invalidUsers.push(row);
            }
            const existingUser = await User.findOne({ email: row.email });

            if (existingUser) {
              row.error = "List cannot have duplicate emails";
              invalidUsers.push(row);
            }
            const customProperties = list.customProperties.map((prop) => {
              return {
                title: prop.title,
                value: row[prop.title] || prop.defaultValue,
              };
            });

            if (!row.error) {
              users.push({
                name: row.name,
                email: row.email,
                listId: list._id,
                customProperties,
              });
            }
          } catch (error) {
            console.log(error.message);
          }
        }

        if (users.length > 0) {
          await User.insertMany(users);
        }

        //headers for the csv file
        const headers = [
          {
            id: "name",
            title: "Name",
          },
          {
            id: "email",
            title: "Email",
          },
          ...list.customProperties.map((prop) => {
            return { id: prop.title, title: prop.title };
          }),
          {
            id: "error",
            title: "Error",
          },
        ];

        const csvWriter = createObjectCsvStringifier({
          header: headers,
        });

        const csvInvalidUsers = invalidUsers.map((user) => {
          const customProperties = list.customProperties.map((acc, prop) => {
            acc[prop.title] = user[prop.title] || "";
            return acc;
          });
          return { ...user, ...customProperties };
        });

        const csvString =
          csvWriter.getHeaderString() +
          csvWriter.stringifyRecords(csvInvalidUsers);

        const totalUsers = users.length + invalidUsers.length;

        const result = {
          userAdded: users.length,
          userNotAdded: invalidUsers.length,
          totalUsers,
          invalidUsers: csvString,
        };

        console.log("\x1b[35mSending result to the result queue \x1b[0m");

        //send the result to the result queue
        channel.sendToQueue(
          msg.properties.replyTo,
          Buffer.from(JSON.stringify(result)),
          {
            correlationId: msg.properties.correlationId,
          }
        );

        //acknowledge the message to remove it from the queue
        channel.ack(msg);
      }
    },
    {
      noAck: false,
    }
  );
}
