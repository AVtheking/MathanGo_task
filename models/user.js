import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    trim: true,
  },
  listId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "lists",
  },
  unsubscribedLists: [
    {
      listId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "lists",
      },
    },
    8,
  ],
  customProperties: [{ title: String, value: String }],
});

export const User = new mongoose.model("users", userSchema);
