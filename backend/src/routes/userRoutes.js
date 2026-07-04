import express from "express";
import { getAllSalesmen, adjustLedgerBalance, getAllOperators, registerUser, getSalesmanStatementHistory, updateUser, deleteUser, getSalesmanDailyStatus } from "../controllers/userController.js";
import { verifyOwner } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.get("/salesmen", getAllSalesmen);
router.get("/operators", getAllOperators);
router.get("/statement/:salesmanId", getSalesmanStatementHistory);
router.post("/register", verifyOwner, registerUser);
router.patch("/adjust-balance", verifyOwner, adjustLedgerBalance); 
router.put("/:id", verifyOwner, updateUser);
router.delete("/:id", verifyOwner, deleteUser);
router.get("/:salesmanId/daily-status", getSalesmanDailyStatus);

export default router;
