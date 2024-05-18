import { default as csvParser } from "csv-parser";
import { createObjectCsvStringifier } from "csv-writer";
import fs from "fs";
import mongoose from "mongoose";
import { ErrorHandler } from "../middlewares/error.js";
import { List } from "../models/list.js";
import { User } from "../models/user.js";
import { emailBody } from "../utils/emailBody.js";
import { sendMail } from "../utils/mailer.js";

export const listCtrl = {
  createList: async (req, res, next) => {
    try {
      const { title, customProperties } = req.body;
      if (!title || !customProperties) {
        return next(
          new ErrorHandler(400, "Title and customProperties are required")
        );
      }

      await List.create({
        title,
        customProperties: [...customProperties],
      });
      return res.status(201).json({ success: true, message: "List created" });
    } catch (error) {
      return res.status(500).json({ msg: error.message });
    }
  },
  uploadUsers: async (req, res, next) => {
    try {
      const listId = req.params.listId;
      const list = await List.findById(listId);
      if (!list) {
        return res.status;
      }
      if (!req.file) {
        return next(new ErrorHandler(400, "Please upload a file"));
      }
      const rows = [];
      const users = [];
      const invalidUsers = [];

      await new Promise((resolve, reject) => {
        fs.createReadStream(req.file.path)
          .pipe(csvParser())
          .on("data", (row) => rows.push(row))
          .on("end", resolve)
          .on("error", () => reject);
      });
      for (const row of rows) {
        try {
          if (!row.name.trim() || !row.email.trim()) {
            row.error = "Name and email are required";
            invalidUsers.push(row);
          }
          const existingUser = await User.findOne({ email: row.email });
          console.log(`\x1b[34mexisting user:${existingUser}\x1b[0m`);
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

          console.log(`error:${row.error}`);
          console.log(`name:${row.name}`);
          console.log(`email:${row.email}`);
          console.log(`users:${JSON.stringify(users)}`);

          if (!row.error) {
            users.push({
              name: row.name,
              email: row.email,
              listId,
              customProperties,
            });
          }
        } catch (error) {
          console.log(error);
          reject(error);
        }
      }
      fs.unlinkSync(req.file.path);
      console.log(`final users:${JSON.stringify(users)} `);
      console.log(invalidUsers);
      if (users.length > 0) {
        await User.insertMany(users);
      }

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

      invalidUsers.length > 0
        ? res.status(200).json({
            success: true,
            message: `${users.length} users added out of ${totalUsers}`,
            data: {
              userAdded: users.length,
              userFailed: invalidUsers.length,
              totalUsers,
              invalidUsers: csvString,
            },
          })
        : res.status(200).json({
            success: true,
            message: `${users.length} users added out of ${totalUsers}`,
            data: {
              userAdded: users.length,
              userFailed: invalidUsers.length,
              totalUsers,
            },
          });
    } catch (error) {
      return next(new ErrorHandler(500, error.message));
    }
  },

  sendMail: async (req, res, next) => {
    try {
      const listId = req.params.listId;
      const list = await List.findById(listId);
      if (!list) {
        return next(new ErrorHandler(404, "List not found"));
      }
      const users = await User.find({ listId });
      if (users.length === 0) {
        return next(new ErrorHandler(404, "No users found"));
      }
      const usersToSend = users.filter(
        (user) => !user.unsubscribedLists.includes(listId.toString())
      );

      if (usersToSend.length === 0) {
        return next(new ErrorHandler(404, "No subscribed users found"));
      }

      usersToSend.forEach((user) => {
        const unsubscribeUrl = `http://localhost:5000/api/v1/list/${listId}/unsubscribe/${user._id}`;
        const customPropertiy = user.customProperties.find(
          (prop) => prop.title === "city"
        );
        console.log(customPropertiy.value);
        const personalizedEmailBody = emailBody(unsubscribeUrl)
          .replace("[name]", user.name)
          .replace("[email]", user.email)
          .replace("[city]", customPropertiy.value);
        sendMail(user.email, "Welcome to MathonGo", personalizedEmailBody);
      });
      return res
        .status(200)
        .json({ success: true, message: "Email sent to all subscribed users" });
    } catch (error) {
      return next(new ErrorHandler(500, error.message));
    }
  },
  unsubscribeEmail: async (req, res, next) => {
    console.log("here");
    try {
      const { listId, userId } = req.params;
      const user = await User.findById(userId);
      if (!user) {
        return next(new ErrorHandler(404, "User not found"));
      }

      await User.findByIdAndUpdate(
        userId,
        {
          $push: { unsubscribedLists: new mongoose.Types.ObjectId(listId) },
        },
        {
          new: true,
        }
      );

      return res.send("Unsubscribed successfully");
    } catch (error) {
      next(new ErrorHandler(500, error.message));
    }
  },
};
