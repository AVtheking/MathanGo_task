import mongoose from "mongoose";

const customProperty = {
  title: String,
  defaultValue: String,
};
const listSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  customProperties: [customProperty],
});

export const List = mongoose.model("lists", listSchema);
