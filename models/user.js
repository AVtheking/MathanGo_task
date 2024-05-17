import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    unique: true,
    required: true,
    trim: true,
  },
  listId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "lists",
  },
  customProperties: [{ value: String }],
});

export const User = new mongoose.model("users", userSchema);
