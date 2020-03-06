import * as c from "../controllers/categories";
import { getCards } from "../controllers/cards";
import express from "express";
import validateBody from "../middleware/validateBody";
import { PatchCategorySchema } from "../Schemas/Category";

const router = express.Router();

router.post("/", c.createCategory);
router.get("/", c.getCategories);
router.get("/:categoryId", c.getCategory);
router.get("/:categoryId/cards", c.getCategoryCards, getCards);
router.patch(
  "/:categoryId",
  validateBody(PatchCategorySchema),
  c.updateCategory
);
router.delete("/:categoryId", c.deleteCategory);

export default router;
