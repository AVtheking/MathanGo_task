import { default as csvParser } from "csv-parser";
import fs from "fs";
import { v4 as uuidv4 } from "uuid";
import { ErrorHandler } from "../middlewares/error.js";
import { List } from "../models/list.js";
import { User } from "../models/user.js";
import { channel } from "../utils/connectRabbitMq.js";
import {
  CSV_PARSE_QUEUE,
  RESULT_QUEUE,
  UNSUBSCRIBE_QUEUE,
} from "../utils/constants.js";

export const listCtrl = {
  /*
    * Create a new list
    * POST /api/list/create
    * @body {String} title - Title of the list
    * @body {Array} customProperties - Custom properties of the list
    * @returns {Object} - Success message

  */
  createList: async (req, res, next) => {
    try {
      const { title, customProperties } = req.body;

      //check if the title and custom properties are present
      if (!title || !customProperties) {
        return next(
          new ErrorHandler(400, "Title and customProperties are required")
        );
      }

      //check if the title and default value are present in the custom Property
      customProperties.forEach((property) => {
        if (!property.title || !property.defaultValue) {
          return next(
            new ErrorHandler(400, "Title and defaultValue are required")
          );
        }
      });

      //creating a list with the title and custom properties
      await List.create({
        title,
        customProperties: [...customProperties],
      });
      return res.status(201).json({ success: true, message: "List created" });
    } catch (error) {
      return next(new ErrorHandler(500, error.message));
    }
  },

  /*
   *Upload the users to the list
   *POST /api/list/upload/:listId
   *@param {String} listId - Id of the list
   *@body {File} file - File containing the users
   */
  uploadUsers: async (req, res, next) => {
    try {
      const listId = req.params.listId;

      const list = await List.findById(listId);

      //check if the list exists
      if (!list) {
        return next(new ErrorHandler(404, "List not found"));
      }

      //check if the file is uploaded
      if (!req.file) {
        return next(new ErrorHandler(400, "Please upload a file"));
      }
      const rows = [];

      //parse the csv file
      await new Promise((resolve, reject) => {
        fs.createReadStream(req.file.path)
          .pipe(csvParser())
          .on("data", (row) => rows.push(row))
          .on("end", resolve)
          .on("error", () => reject);
      });

      //id for specifing the reciever of the message
      const correlationId = uuidv4();

      console.log("\x1b[35mSending message to csv queue");

      //sending the message to the csv queue
      channel.sendToQueue(
        CSV_PARSE_QUEUE,
        Buffer.from(JSON.stringify({ list, rows })),
        {
          correlationId,
          replyTo: RESULT_QUEUE,
        }
      );

      fs.unlinkSync(req.file.path);

      //process the result presnt in the result queue
      channel.consume(
        RESULT_QUEUE,
        async (msg) => {
          if (msg.properties.correlationId === correlationId) {
            console.log(
              "\x1b[31m.......Message recieved from result queue........\x1b[0m"
            );

            const result = JSON.parse(msg.content.toString());
            const { userNotAdded, userAdded, totalUsers } = JSON.parse(
              msg.content.toString()
            );

            //if some users are not added then return response with
            //the number of users added , not added and total users and CSV
            userNotAdded > 0
              ? res.status(200).json({
                  success: true,
                  message: `${userAdded} users added out of ${totalUsers}`,
                  data: {
                    ...result,
                  },
                })
              : //if all users are added then return response with
                //the number of users added and total users
                res.status(200).json({
                  success: true,
                  message: `${userAdded} users added out of ${totalUsers}`,
                  data: {
                    ...result,
                  },
                });
            channel.ack(msg);
          }
        },
        {
          noAck: false,
        }
      );
    } catch (error) {
      return next(new ErrorHandler(500, error.message));
    }
  },

  /*
   *Send email to all subscribed users
   *POST /api/list/sendMail/:listId
   *@param {String} listId - Id of the list
   */
  sendMail: async (req, res, next) => {
    try {
      const listId = req.params.listId;
      const list = await List.findById(listId);

      //check if the list exists
      if (!list) {
        return next(new ErrorHandler(404, "List not found"));
      }

      //find all the users in the list
      const users = await User.find({ listId });

      if (users.length === 0) {
        return next(new ErrorHandler(404, "No users found"));
      }
      //filter the users who have unsubscribed from the email
      const usersToSend = users.filter(
        (user) => !user.unsubscribedLists.includes(listId.toString())
      );

      if (usersToSend.length === 0) {
        return next(new ErrorHandler(404, "No subscribed users found"));
      }
      console.log("\x1b[35mSending message to email queue");

      //sending the message to the email queue
      channel.sendToQueue(
        EMAIL_QUEUE,
        Buffer.from(JSON.stringify({ listId, usersToSend }))
      );

      return res
        .status(200)
        .json({ success: true, message: "Email sent to all subscribed users" });
    } catch (error) {
      return next(new ErrorHandler(500, error.message));
    }
  },

  /*
   *Unsubscribe the user from the email
   *GET /api/list/:listId/unsubscribe/:userId
   *@param {String} listId - Id of the list
   *@param {String} userId - Id of the user
   */
  unsubscribeEmail: async (req, res, next) => {
    try {
      const { listId, userId } = req.params;

      const user = await User.findById(userId);
      const list = await List.findById(listId);
      //check if the user exists
      if (!user) {
        return next(new ErrorHandler(404, "User not found"));
      }

      //check if the list exists
      if (!list) {
        return next(new ErrorHandler(404, "List not found"));
      }

      console.log("\x1b[35mSending message to unsubscribe queue");

      const isUserUnsubscribed = user.unsubscribedLists.find(
        (list) => list.listId == listId
      );

      // console.log(user.unsubscribedLists);
      if (isUserUnsubscribed) {
        return res.send("You are already unsubscribed");
      }

      //sending the message to the unsubscribe queue
      channel.sendToQueue(
        UNSUBSCRIBE_QUEUE,
        Buffer.from(JSON.stringify({ listId, userId }))
      );

      return res.send("Unsubscribed successfully");
    } catch (error) {
      next(new ErrorHandler(500, error.message));
    }
  },
};
