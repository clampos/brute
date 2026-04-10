"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// server/protected.ts
const express_1 = __importDefault(require("express"));
const authMiddleware_1 = require("./authMiddleware");
const prisma_1 = require("./prisma");
const router = express_1.default.Router();
router.get('/dashboard', authMiddleware_1.authenticateToken, async (req, res) => {
    const userId = req.user.userId;
    const user = await prisma_1.prisma.user.findUnique({
        where: { id: userId },
        select: { firstName: true, surname: true },
    });
    if (!user)
        return res.status(404).json({ error: "User not found" });
    res.json({
        message: "Welcome back!",
        firstName: user.firstName,
        surname: user.surname,
    });
});
exports.default = router;
