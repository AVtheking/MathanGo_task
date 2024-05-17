import { default as csvParser } from "csv-parser";
import fs from "fs";
import { ErrorHandler } from "../middlewares/error.js";
import { List } from "../models/list.js";
import { User } from "../models/user.js";

export const listCtrl = {
  createList: async (req, res, next) => {
    try {
      const { title, customProperties } = req.body;
      if (!title || !customProperties) {
        return next(
          new ErrorHandler(400, "Title and customProperties are required")
        );
      }
      console.log(title, customProperties);
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
      console.log(req.file);

      const processRow = async (row) => {
        if (!row.name || !row.email) {
          return next(new ErrorHandler(400, "Name and email are required"));
        }

        const existingUser = await User.findOne({ email: row.email });

        if (existingUser) {
          return next(
            new ErrorHandler(400, "List cannot have duplicate emails")
          );
        }

        const customProperties = list.customProperties.map((prop) => {
          return { value: row[prop.title] || prop.defaultValue };
        });

        await User.create({
          name: row.name,
          email: row.email,
          listId,
          customProperties,
        });
      };
      await new Promise((resolve, reject) => {
        fs.createReadStream(req.file.path)
          .pipe(csvParser())
          .on("data", (row) => processRow(row).catch(reject))
          .on("end", resolve)
          .on("error", reject);
      });

      
      return res.status(200).json({
        success: true,
        message: "users data added successfully",
        data: {},
      });
    } catch (error) {
      return next(new ErrorHandler(500, error.message));
    }
  },
};
