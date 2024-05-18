import express from "express";
import multer from "multer";
import { listCtrl } from "../controllers/list_controller.js";
export const router = express.Router();
const upload = multer({ dest: "uploads/" });

router.post("/create", listCtrl.createList);
router.post("/upload/:listId", upload.single("users"), listCtrl.uploadUsers);
router.post("/sendMail/:listId", listCtrl.sendMail);
router.get("/:listId/unsubscribe/:userId", listCtrl.unsubscribeEmail);
