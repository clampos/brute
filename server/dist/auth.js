"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// server/auth.ts
const express_1 = __importDefault(require("express"));
const stripe_1 = __importDefault(require("stripe"));
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const prisma_1 = require("./prisma");
const authMiddleware_1 = require("./authMiddleware");
const referralUtils_1 = require("./utils/referralUtils");
const email_1 = require("../server/email");
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const progressiveOverloadService_1 = require("./utils/progressiveOverloadService");
const router = express_1.default.Router();
// Configure multer storage
const storage = multer_1.default.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = path_1.default.join(__dirname, "../../uploads/profile-photos");
        if (!fs_1.default.existsSync(uploadDir)) {
            fs_1.default.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const ext = path_1.default.extname(file.originalname);
        const userId = req.user.userId;
        cb(null, `user-${userId}${ext}`);
    },
});
const upload = (0, multer_1.default)({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: function (req, file, cb) {
        if (file.mimetype.startsWith("image/")) {
            cb(null, true);
        }
        else {
            cb(new Error("Only image files are allowed!"));
        }
    },
});
// Stripe setup
const stripe = new stripe_1.default(process.env.STRIPE_SECRET_KEY, {
    apiVersion: "2025-04-30.basil",
});
// JWT secret
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
    throw new Error("JWT_SECRET environment variable is required");
}
// --- LOGIN ---
router.post("/login", async (req, res) => {
    const email = req.body.email?.trim().toLowerCase();
    const { password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required" });
    }
    const user = await prisma_1.prisma.user.findUnique({ where: { email } });
    if (!user || !user.password) {
        return res.status(401).json({ error: "Invalid credentials" });
    }
    const passwordMatch = await bcrypt_1.default.compare(password, user.password);
    if (!passwordMatch) {
        return res.status(401).json({ error: "Invalid credentials" });
    }
    if (!user.subscribed) {
        return res.status(403).json({ error: "User not subscribed" });
    }
    // Generate JWT
    const token = jsonwebtoken_1.default.sign({ userId: user.id, email: user.email }, JWT_SECRET, {
        expiresIn: "1d",
    });
    res.json({ token });
});
// --- SIGNUP --- (Updated version)
router.post("/signup", async (req, res) => {
    const email = req.body.email?.trim().toLowerCase();
    const { password, firstName, surname, referralCode } = req.body;
    console.log("🔄 Signup attempt:", {
        email,
        firstName,
        surname,
        referralCode,
    });
    if (!email || !password || !firstName || !surname) {
        return res.status(400).json({ error: "Email, password, first name and surname are required." });
    }
    const existingUser = await prisma_1.prisma.user.findUnique({ where: { email } });
    if (existingUser) {
        return res.status(400).json({ error: "User already exists." });
    }
    const hashedPassword = await bcrypt_1.default.hash(password, 10);
    // Check if referral code is valid
    let referrer = null;
    if (referralCode) {
        referrer = await prisma_1.prisma.user.findUnique({
            where: { referralCode },
        });
        if (!referrer) {
            return res.status(400).json({ error: "Invalid referral code." });
        }
        console.log("✅ Valid referral code found:", referralCode, "Referrer:", referrer.firstName, referrer.surname);
    }
    // Generate unique referral code for new user
    const newUserReferralCode = await (0, referralUtils_1.generateUniqueReferralCode)(firstName, surname, prisma_1.prisma);
    console.log("🆔 Generated referral code for new user:", newUserReferralCode);
    const newUser = await prisma_1.prisma.user.create({
        data: {
            email,
            password: hashedPassword,
            firstName,
            surname,
            referralCode: newUserReferralCode,
            referredBy: referrer?.id,
        },
    });
    console.log("👤 New user created:", newUser.id);
    try {
        // Base session configuration
        const sessionConfig = {
            payment_method_types: ["card"],
            mode: "subscription",
            line_items: [
                {
                    price: process.env.STRIPE_PRICE_ID,
                    quantity: 1,
                },
            ],
            customer_email: email,
            success_url: `${process.env.CLIENT_URL}/subscription-success?email=${encodeURIComponent(email)}`,
            cancel_url: `${process.env.CLIENT_URL}/login`,
            metadata: {
                userId: newUser.id.toString(),
                referredBy: referrer?.id?.toString() || "",
                referralCode: referralCode || "",
                newUserReferralCode: newUserReferralCode,
            },
            // Add trial period for ALL users (30 days free trial)
            subscription_data: {
                trial_period_days: 30,
            },
        };
        // Apply ADDITIONAL referral discount if user was referred
        // This gives them ANOTHER free month on top of the 30-day trial
        if (referrer) {
            console.log("🎁 Applying additional referral discount");
            sessionConfig.discounts = [
                {
                    coupon: "BFLS4uO9", // Your referral discount coupon - should be for 1 month free
                },
            ];
        }
        console.log("🔄 Creating Stripe session with config:", JSON.stringify(sessionConfig, null, 2));
        const session = await stripe.checkout.sessions.create(sessionConfig);
        console.log("✅ Stripe session created successfully:", session.id);
        res.json({ checkoutUrl: session.url });
    }
    catch (err) {
        console.error("❌ Stripe error:", err);
        // Clean up user if Stripe session creation fails
        await prisma_1.prisma.user.delete({ where: { id: newUser.id } });
        res.status(500).json({
            error: "Failed to create Stripe session",
            details: err instanceof Error ? err.message : "Unknown error",
        });
    }
});
// Add this improved version to your auth.ts file
// Only showing the fixed /auth/token endpoint - add this to your existing auth.ts
// GET /auth/token?email=... - IMPROVED VERSION with detailed logging
router.get("/token", async (req, res) => {
    const email = req.query.email;
    console.log(`🔍 Token request for email: ${email} at ${new Date().toISOString()}`);
    if (!email) {
        console.error("❌ Token request missing email");
        return res.status(400).json({ error: "Email required" });
    }
    try {
        const user = await prisma_1.prisma.user.findUnique({
            where: { email },
            select: {
                id: true,
                email: true,
                subscribed: true,
                createdAt: true,
                firstName: true,
                surname: true,
                updatedAt: true,
            },
        });
        console.log(`📊 User lookup result:`, {
            found: !!user,
            id: user?.id,
            email: user?.email,
            subscribed: user?.subscribed,
            createdAt: user?.createdAt,
            updatedAt: user?.updatedAt,
            name: user ? `${user.firstName} ${user.surname}` : "N/A",
            timeSinceCreation: user
                ? `${Math.round((Date.now() - new Date(user.createdAt).getTime()) / 1000)}s`
                : "N/A",
            timeSinceUpdate: user
                ? `${Math.round((Date.now() - new Date(user.updatedAt).getTime()) / 1000)}s`
                : "N/A",
        });
        if (!user) {
            console.error(`❌ User not found for email: ${email}`);
            return res.status(404).json({
                error: "User not found",
                debug: {
                    email,
                    timestamp: new Date().toISOString(),
                    message: "User does not exist in database",
                },
            });
        }
        if (!user.subscribed) {
            console.error(`❌ User not subscribed yet: ${email}`, {
                userId: user.id,
                subscribed: user.subscribed,
                createdAt: user.createdAt,
                timeSinceCreation: `${Math.round((Date.now() - new Date(user.createdAt).getTime()) / 1000)}s`,
                message: "Webhook may still be processing",
            });
            return res.status(403).json({
                error: "Subscription not active yet",
                debug: {
                    email,
                    userId: user.id,
                    subscribed: user.subscribed,
                    timestamp: new Date().toISOString(),
                    message: "Webhook is still processing your subscription. Please wait...",
                },
            });
        }
        // Generate JWT token
        const token = jsonwebtoken_1.default.sign({ userId: user.id, email: user.email }, process.env.JWT_SECRET, { expiresIn: "1d" });
        console.log(`✅ Token generated successfully for: ${email}`, {
            userId: user.id,
            tokenLength: token.length,
        });
        res.json({ token });
    }
    catch (error) {
        console.error("❌ Database error in token endpoint:", error);
        res.status(500).json({
            error: "Internal server error",
            debug: {
                email,
                timestamp: new Date().toISOString(),
                message: "Database query failed",
            },
        });
    }
});
// Get user's referral stats
router.get("/referrals", authMiddleware_1.authenticateToken, async (req, res) => {
    const userId = req.user.userId;
    const user = await prisma_1.prisma.user.findUnique({
        where: { id: userId },
        include: {
            referredUsers: {
                select: {
                    firstName: true,
                    surname: true,
                    createdAt: true,
                    subscribed: true,
                },
            },
        },
    });
    if (!user) {
        return res.status(404).json({ error: "User not found" });
    }
    res.json({
        referralCode: user.referralCode,
        referralCredits: user.referralCredits || 0,
        freeMonthsEarned: user.freeMonthsEarned || 0,
        referredUsers: user.referredUsers,
        totalReferrals: user.referredUsers.length,
        activeReferrals: user.referredUsers.filter((u) => u.subscribed).length,
    });
});
// Add these endpoints to your auth.ts file
// Change Password endpoint
router.post("/change-password", authMiddleware_1.authenticateToken, async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.userId;
    if (!currentPassword || !newPassword) {
        return res
            .status(400)
            .json({ error: "Current password and new password are required" });
    }
    if (newPassword.length < 8) {
        return res
            .status(400)
            .json({ error: "New password must be at least 8 characters long" });
    }
    try {
        const user = await prisma_1.prisma.user.findUnique({
            where: { id: userId },
            select: { password: true },
        });
        if (!user || !user.password) {
            return res.status(404).json({ error: "User not found" });
        }
        // Verify current password
        const passwordMatch = await bcrypt_1.default.compare(currentPassword, user.password);
        if (!passwordMatch) {
            return res.status(400).json({ error: "Current password is incorrect" });
        }
        // Hash new password
        const hashedNewPassword = await bcrypt_1.default.hash(newPassword, 10);
        // Update password in database
        await prisma_1.prisma.user.update({
            where: { id: userId },
            data: { password: hashedNewPassword },
        });
        console.log(`✅ Password changed for user: ${userId}`);
        res.json({ message: "Password changed successfully" });
    }
    catch (error) {
        console.error("❌ Change password error:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});
// Change Email endpoint
router.post("/change-email", authMiddleware_1.authenticateToken, async (req, res) => {
    const { currentPassword, newEmail } = req.body;
    const userId = req.user.userId;
    if (!currentPassword || !newEmail) {
        return res
            .status(400)
            .json({ error: "Current password and new email are required" });
    }
    // Basic email format check
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
        return res.status(400).json({ error: "Invalid email format" });
    }
    try {
        // Ensure new email is not already taken
        const existing = await prisma_1.prisma.user.findUnique({
            where: { email: newEmail },
        });
        if (existing) {
            return res.status(400).json({ error: "Email already in use" });
        }
        const user = await prisma_1.prisma.user.findUnique({
            where: { id: userId },
            select: { password: true },
        });
        if (!user || !user.password)
            return res.status(404).json({ error: "User not found" });
        const match = await bcrypt_1.default.compare(currentPassword, user.password);
        if (!match)
            return res.status(400).json({ error: "Current password is incorrect" });
        await prisma_1.prisma.user.update({
            where: { id: userId },
            data: { email: newEmail },
        });
        console.log(`✅ Email changed for user ${userId} -> ${newEmail}`);
        res.json({ message: "Email changed successfully" });
    }
    catch (err) {
        console.error("Error changing email:", err);
        res.status(500).json({ error: "Internal server error" });
    }
});
// Forgot Password endpoint
router.post("/forgot-password", async (req, res) => {
    const email = req.body.email?.trim().toLowerCase();
    if (!email) {
        return res.status(400).json({ error: "Email is required" });
    }
    try {
        const user = await prisma_1.prisma.user.findUnique({ where: { email } });
        if (!user) {
            // Don't reveal if email exists or not for security
            return res.json({
                message: "If that email is registered, we've sent a reset link",
            });
        }
        // Generate reset token (expires in 1 hour)
        const resetToken = jsonwebtoken_1.default.sign({ userId: user.id, email: user.email, type: "password_reset" }, JWT_SECRET, { expiresIn: "1h" });
        // Store reset token in database (you might want to add a passwordResetToken field to your User model)
        await prisma_1.prisma.user.update({
            where: { id: user.id },
            data: {
                // Add these fields to your Prisma schema:
                // passwordResetToken: String?
                // passwordResetExpires: DateTime?
                passwordResetToken: resetToken,
                passwordResetExpires: new Date(Date.now() + 3600000), // 1 hour from now
            },
        });
        // Send reset email
        await (0, email_1.sendPasswordResetEmail)(email, resetToken);
        console.log(`✅ Password reset email sent to: ${email}`);
        res.json({
            message: "If that email is registered, we've sent a reset link",
        });
    }
    catch (error) {
        console.error("❌ Forgot password error:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});
// Reset Password endpoint (for when user clicks link in email)
router.post("/reset-password", async (req, res) => {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) {
        return res
            .status(400)
            .json({ error: "Token and new password are required" });
    }
    if (newPassword.length < 8) {
        return res
            .status(400)
            .json({ error: "New password must be at least 8 characters long" });
    }
    try {
        // Verify reset token
        const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        if (decoded.type !== "password_reset") {
            return res.status(400).json({ error: "Invalid reset token" });
        }
        // Check if token exists in database and hasn't expired
        const user = await prisma_1.prisma.user.findFirst({
            where: {
                id: decoded.userId,
                passwordResetToken: token,
                passwordResetExpires: {
                    gt: new Date(),
                },
            },
        });
        if (!user) {
            return res
                .status(400)
                .json({ error: "Reset token is invalid or has expired" });
        }
        // Hash new password
        const hashedPassword = await bcrypt_1.default.hash(newPassword, 10);
        // Update password and clear reset token
        await prisma_1.prisma.user.update({
            where: { id: user.id },
            data: {
                password: hashedPassword,
                passwordResetToken: null,
                passwordResetExpires: null,
            },
        });
        console.log(`✅ Password reset successful for user: ${user.email}`);
        res.json({ message: "Password reset successful" });
    }
    catch (error) {
        if (error instanceof jsonwebtoken_1.default.JsonWebTokenError) {
            return res
                .status(400)
                .json({ error: "Invalid or expired reset token" });
        }
        console.error("❌ Reset password error:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});
// DELETE /auth/delete-account
router.delete("/delete-account", authMiddleware_1.authenticateToken, async (req, res) => {
    const userId = req.user.userId;
    try {
        // Optional: You could first cancel the user's Stripe subscription here if you store subscription ID
        // Delete the user
        await prisma_1.prisma.user.delete({
            where: { id: userId },
        });
        console.log(`🗑️ Account deleted for user: ${userId}`);
        res.status(200).json({ message: "Account deleted successfully" });
    }
    catch (error) {
        console.error("❌ Failed to delete account:", error);
        res.status(500).json({ error: "Failed to delete account" });
    }
});
router.get("/dashboard", authMiddleware_1.authenticateToken, async (req, res) => {
    const userId = req.user.userId;
    try {
        const user = await prisma_1.prisma.user.findUnique({
            where: { id: userId },
            select: {
                email: true,
                firstName: true,
                surname: true,
                subscribed: true,
                referralCode: true,
            },
        });
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }
        if (!user.subscribed) {
            return res.status(403).json({ error: "Subscription required" });
        }
        res.json({
            firstName: user.firstName,
            surname: user.surname,
            message: `Welcome back, ${user.firstName}!`,
        });
    }
    catch (error) {
        console.error("Dashboard fetch error:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});
// GET /auth/settings
router.get("/settings", authMiddleware_1.authenticateToken, async (req, res) => {
    const userId = req.user.userId;
    try {
        const user = await prisma_1.prisma.user.findUnique({
            where: { id: userId },
            select: {
                firstName: true,
                surname: true,
                email: true,
                subscribed: true,
                referralCode: true,
            },
        });
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }
        res.json(user);
    }
    catch (error) {
        console.error("Settings fetch error:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});
// GET /auth/settings
router.get("/workouts", authMiddleware_1.authenticateToken, async (req, res) => {
    const userId = req.user.userId;
    try {
        const user = await prisma_1.prisma.user.findUnique({
            where: { id: userId },
            select: {
                firstName: true,
                surname: true,
                email: true,
                subscribed: true,
                referralCode: true,
            },
        });
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }
        res.json(user);
    }
    catch (error) {
        console.error("Settings fetch error:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});
// POST /auth/user/profile-photo - Upload profile photo
router.post("/user/profile-photo", authMiddleware_1.authenticateToken, upload.single("profilePhoto"), async (req, res) => {
    const userId = req.user.userId;
    try {
        if (!req.file) {
            return res.status(400).json({ error: "No file uploaded" });
        }
        // Create the relative path that will be stored in the database
        const profilePhotoPath = `/uploads/profile-photos/${req.file.filename}`;
        // Update user's profile photo in database
        await prisma_1.prisma.user.update({
            where: { id: userId },
            data: {
                profilePhoto: profilePhotoPath,
            },
        });
        console.log(`✅ Profile photo uploaded for user ${userId}: ${profilePhotoPath}`);
        res.json({
            message: "Profile photo uploaded successfully",
            profilePhoto: profilePhotoPath,
        });
    }
    catch (error) {
        console.error("Profile photo upload error:", error);
        res.status(500).json({ error: "Failed to upload profile photo" });
    }
});
// DELETE /auth/user/profile-photo - Remove profile photo
router.delete("/user/profile-photo", authMiddleware_1.authenticateToken, async (req, res) => {
    const userId = req.user.userId;
    try {
        // Get current profile photo path
        const user = await prisma_1.prisma.user.findUnique({
            where: { id: userId },
            select: { profilePhoto: true },
        });
        if (user?.profilePhoto) {
            // Delete the file from filesystem
            const filePath = path_1.default.join(__dirname, "../../", user.profilePhoto);
            if (fs_1.default.existsSync(filePath)) {
                fs_1.default.unlinkSync(filePath);
            }
        }
        // Update database to remove profile photo
        await prisma_1.prisma.user.update({
            where: { id: userId },
            data: {
                profilePhoto: null,
            },
        });
        console.log(`✅ Profile photo removed for user ${userId}`);
        res.json({ message: "Profile photo removed successfully" });
    }
    catch (error) {
        console.error("Profile photo removal error:", error);
        res.status(500).json({ error: "Failed to remove profile photo" });
    }
});
// GET /user/profile
router.get("/user/profile", authMiddleware_1.authenticateToken, async (req, res) => {
    const userId = req.user.userId;
    try {
        const user = await prisma_1.prisma.user.findUnique({
            where: { id: userId },
            select: {
                bodyweight: true,
                height: true,
                birthday: true,
                gender: true,
                profilePhoto: true, // Make sure to include profilePhoto
            },
        });
        if (!user)
            return res.status(404).json({ error: "User not found" });
        res.json(user);
    }
    catch (error) {
        console.error("Error fetching user profile:", error);
        res.status(500).json({ error: "Failed to fetch profile" });
    }
});
// PUT /user/profile - Updated to handle profile data without photo upload
router.put("/user/profile", authMiddleware_1.authenticateToken, async (req, res) => {
    const { bodyweight, height, birthday, gender } = req.body;
    const userId = req.user.userId;
    try {
        let birthdayDate = null;
        if (birthday) {
            birthdayDate = new Date(birthday);
            if (isNaN(birthdayDate.getTime())) {
                return res.status(400).json({ error: "Invalid birthday format" });
            }
        }
        const updatedUser = await prisma_1.prisma.user.update({
            where: { id: userId },
            data: {
                bodyweight: bodyweight || null,
                height: height || null,
                birthday: birthdayDate,
                gender: gender || null,
            },
            select: {
                bodyweight: true,
                height: true,
                birthday: true,
                gender: true,
                profilePhoto: true,
            },
        });
        res.status(200).json({
            message: "Profile updated successfully",
            ...updatedUser,
        });
    }
    catch (err) {
        console.error("Profile update error:", err);
        res.status(500).json({ error: "Update failed" });
    }
});
// GET /auth/programmes
router.get("/programmes", authMiddleware_1.authenticateToken, async (req, res) => {
    try {
        const userId = req.user?.userId;
        // Get library programmes (no userId) + user's custom programmes
        const programmes = await prisma_1.prisma.programme.findMany({
            where: {
            // remove userId filtering if not in schema
            },
            // where: {
            // OR: [
            // { userId: null }, // Library programmes
            // { userId: userId }, // User's custom programmes
            // ],
            // },
            include: {
                exercises: true,
            },
            orderBy: {
                createdAt: "desc",
            },
        });
        res.json(programmes);
    }
    catch (error) {
        console.error("Error fetching programmes:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});
router.get("/programmes/:id", authMiddleware_1.authenticateToken, async (req, res) => {
    const { id } = req.params;
    try {
        const programme = await prisma_1.prisma.programme.findUnique({
            where: { id },
            include: {
                exercises: {
                    include: {
                        exercise: true,
                    },
                    orderBy: [{ dayNumber: "asc" }, { orderIndex: "asc" }],
                },
            },
        });
        if (!programme) {
            return res.status(404).json({ error: "Programme not found" });
        }
        res.json(programme);
    }
    catch (error) {
        console.error("Error fetching programme:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});
router.post("/programmes", authMiddleware_1.authenticateToken, async (req, res) => {
    const { name, daysPerWeek, weeks, bodyPartFocus, description } = req.body;
    const userId = req.user?.userId;
    if (!name || !daysPerWeek || !weeks || !bodyPartFocus) {
        return res.status(400).json({ error: "Missing required fields" });
    }
    try {
        const programme = await prisma_1.prisma.programme.create({
            data: {
                name,
                daysPerWeek,
                weeks,
                bodyPartFocus,
                description,
                // isCustom: true, // Mark as custom
                // userId: userId, // Associate with the user
            },
        });
        res.status(201).json(programme);
    }
    catch (error) {
        console.error("Error creating programme:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});
router.put("/programmes/:id", authMiddleware_1.authenticateToken, async (req, res) => {
    const { id } = req.params;
    const { name, daysPerWeek, weeks, bodyPartFocus, description } = req.body;
    try {
        const updated = await prisma_1.prisma.programme.update({
            where: { id },
            data: {
                name,
                daysPerWeek,
                weeks,
                bodyPartFocus,
                description,
            },
        });
        res.json(updated);
    }
    catch (error) {
        console.error("Error updating programme:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});
router.delete("/programmes/:id", authMiddleware_1.authenticateToken, async (req, res) => {
    const { id } = req.params;
    try {
        await prisma_1.prisma.programme.delete({
            where: { id },
        });
        res.status(204).send();
    }
    catch (error) {
        console.error("Error deleting programme:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});
router.get("/random", authMiddleware_1.authenticateToken, async (req, res) => {
    const focus = req.query.focus;
    if (!focus) {
        return res.status(400).json({ error: "Missing focus parameter" });
    }
    try {
        const exercises = await prisma_1.prisma.exercise.findMany({
            where: {
                muscleGroup: {
                    equals: focus,
                },
            },
        });
        if (exercises.length === 0) {
            return res
                .status(404)
                .json({ error: "No exercises found for this focus" });
        }
        const random = exercises[Math.floor(Math.random() * exercises.length)];
        res.json(random);
    }
    catch (err) {
        console.error("Failed to fetch random exercise", err);
        res.status(500).json({ error: "Internal server error" });
    }
});
// POST /auth/programmes/:programmeId/exercises
router.post("/programmes/:programmeId/exercises", authMiddleware_1.authenticateToken, async (req, res) => {
    const { programmeId } = req.params;
    const { exerciseId, dayNumber, sets, reps } = req.body;
    if (!exerciseId || !dayNumber) {
        return res
            .status(400)
            .json({ error: "exerciseId and dayNumber are required" });
    }
    try {
        const newProgrammeExercise = await prisma_1.prisma.programmeExercise.create({
            data: {
                programmeId,
                exerciseId,
                dayNumber,
                sets: sets ?? 3,
                reps: reps ?? "10",
                orderIndex: 0, // could be dynamically calculated later
            },
        });
        return res.status(201).json(newProgrammeExercise);
    }
    catch (err) {
        console.error("Error adding programme exercise:", err);
        return res.status(500).json({ error: "Failed to add exercise" });
    }
});
// routes/programmeRoutes.ts
router.delete("/exercises/:id", async (req, res) => {
    const { id } = req.params;
    try {
        await prisma_1.prisma.programmeExercise.delete({
            where: { id },
        });
        res.status(204).send();
    }
    catch (err) {
        console.error("Error deleting programme exercise:", err);
        res.status(500).json({ error: "Server error" });
    }
});
// GET /auth/exercises/random?focus=Lower%20Body
router.get("/exercises/random", authMiddleware_1.authenticateToken, async (req, res) => {
    const { focus } = req.query;
    try {
        const matchingExercises = await prisma_1.prisma.exercise.findMany({
            where: {
                muscleGroup: {
                    equals: focus,
                },
            },
        });
        if (matchingExercises.length === 0) {
            return res
                .status(404)
                .json({ error: "No exercises found for that focus" });
        }
        const randomIndex = Math.floor(Math.random() * matchingExercises.length);
        const randomExercise = matchingExercises[randomIndex];
        return res.json(randomExercise);
    }
    catch (err) {
        console.error("Error fetching random exercise:", err);
        return res.status(500).json({ error: "Failed to get random exercise" });
    }
});
// Add these endpoints to your auth.ts file
// GET /auth/exercises - Get exercises by muscle group
router.get("/exercises", authMiddleware_1.authenticateToken, async (req, res) => {
    const { muscleGroup, category, equipment } = req.query;
    try {
        const whereClause = {};
        // Note: Prisma client in this environment doesn't support the `mode` option
        // on string filters (case-insensitive). Use exact equals matching because
        // the frontend maps to the seeded `muscleGroup` values (e.g. 'Lats', 'Chest').
        if (muscleGroup) {
            whereClause.muscleGroup = {
                equals: muscleGroup,
            };
        }
        if (category) {
            whereClause.category = {
                equals: category,
            };
        }
        if (equipment) {
            whereClause.equipment = {
                equals: equipment,
            };
        }
        console.debug("GET /auth/exercises whereClause:", JSON.stringify(whereClause));
        const exercises = await prisma_1.prisma.exercise.findMany({
            where: whereClause,
            orderBy: {
                name: "asc",
            },
        });
        res.json(exercises);
    }
    catch (error) {
        // error may be unknown; prefer Error stack when available
        console.error("Error fetching exercises:", error instanceof Error ? error.stack : error);
        res.status(500).json({ error: "Internal server error" });
    }
});
// GET /auth/exercises/all - Get all exercises
router.get("/exercises/all", authMiddleware_1.authenticateToken, async (req, res) => {
    try {
        const exercises = await prisma_1.prisma.exercise.findMany({
            orderBy: [{ muscleGroup: "asc" }, { name: "asc" }],
        });
        res.json(exercises);
    }
    catch (error) {
        console.error("Error fetching all exercises:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});
// POST /auth/exercises - Create new exercise (for admin use)
router.post("/exercises", authMiddleware_1.authenticateToken, async (req, res) => {
    const { name, muscleGroup, category, equipment, instructions } = req.body;
    if (!name || !muscleGroup || !category) {
        return res
            .status(400)
            .json({ error: "Name, muscleGroup, and category are required" });
    }
    try {
        const exercise = await prisma_1.prisma.exercise.create({
            data: {
                name,
                muscleGroup,
                category,
                equipment,
                instructions,
            },
        });
        res.status(201).json(exercise);
    }
    catch (error) {
        console.error("Error creating exercise:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});
// GET /auth/muscle-groups - Get all unique muscle groups
router.get("/muscle-groups", authMiddleware_1.authenticateToken, async (req, res) => {
    try {
        const result = await prisma_1.prisma.exercise.findMany({
            select: {
                muscleGroup: true,
            },
            distinct: ["muscleGroup"],
            orderBy: {
                muscleGroup: "asc",
            },
        });
        const muscleGroups = result.map((r) => r.muscleGroup);
        res.json(muscleGroups);
    }
    catch (error) {
        console.error("Error fetching muscle groups:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});
// POST /auth/user-programs
router.post("/user-programs", authMiddleware_1.authenticateToken, async (req, res) => {
    const { programmeId, startDate } = req.body;
    const userId = req.user.userId;
    try {
        // Get programme details
        const programme = await prisma_1.prisma.programme.findUnique({
            where: { id: programmeId },
        });
        if (!programme) {
            return res.status(404).json({ error: "Programme not found" });
        }
        // Calculate current day and week based on start date
        const start = new Date(startDate);
        const currentDay = calculateCurrentDay(start, programme.daysPerWeek);
        const currentWeek = calculateCurrentWeek(start, programme.daysPerWeek);
        const userProgram = await prisma_1.prisma.userProgram.create({
            data: {
                userId,
                programmeId,
                startDate: start,
                currentDay,
                currentWeek,
                status: "ACTIVE",
            },
            include: {
                programme: {
                    include: {
                        exercises: {
                            include: {
                                exercise: true,
                            },
                            orderBy: [{ dayNumber: "asc" }, { orderIndex: "asc" }],
                        },
                    },
                },
            },
        });
        res.status(201).json(userProgram);
    }
    catch (error) {
        console.error("Error creating user program:", error);
        res.status(500).json({ error: "Failed to create user program" });
    }
});
// Add this endpoint to your auth.ts file
// GET /auth/user-programs - Get user's programmes
router.get("/user-programs", authMiddleware_1.authenticateToken, async (req, res) => {
    const userId = req.user.userId;
    try {
        const userPrograms = await prisma_1.prisma.userProgram.findMany({
            where: { userId },
            include: {
                programme: {
                    include: {
                        exercises: {
                            include: {
                                exercise: true,
                            },
                            orderBy: [{ dayNumber: "asc" }, { orderIndex: "asc" }],
                        },
                    },
                },
            },
            orderBy: {
                createdAt: "desc",
            },
        });
        // NOTE: Removed automatic recalculation of currentDay/currentWeek based on date
        // These should only be updated when workouts are completed, not on every fetch
        res.json(userPrograms);
    }
    catch (error) {
        console.error("Error fetching user programs:", error);
        res.status(500).json({ error: "Failed to fetch user programs" });
    }
});
// POST /auth/workouts - Save completed workout with progression calculation
router.post("/workouts", authMiddleware_1.authenticateToken, async (req, res) => {
    const userId = req.user.userId;
    const { exercises, duration, notes, programmeUpdates } = req.body;
    if (!exercises || !Array.isArray(exercises)) {
        return res.status(400).json({ error: "Exercises data is required" });
    }
    const programmeExerciseUpdates = Array.isArray(programmeUpdates) ? programmeUpdates : [];
    try {
        // Validate exercise data
        const workoutData = exercises.map((exercise) => {
            if (!exercise.exerciseId ||
                !exercise.sets ||
                !Array.isArray(exercise.sets)) {
                throw new Error(`Invalid exercise data for exercise ${exercise.exerciseId}`);
            }
            return {
                exerciseId: exercise.exerciseId,
                sets: exercise.sets.map((set) => ({
                    weight: parseFloat(set.weight) || 0,
                    reps: parseInt(set.reps) || 0,
                    rpe: set.rpe ? parseInt(set.rpe) : undefined,
                    completed: set.completed !== false, // default to true if not specified
                })),
            };
        });
        // Persist programme changes from today's workout so future weeks follow the current layout
        if (programmeExerciseUpdates.length > 0) {
            const userProgram = await prisma_1.prisma.userProgram.findFirst({
                where: { userId, status: "ACTIVE" },
                orderBy: { createdAt: "desc" },
            });
            if (userProgram) {
                const currentDay = userProgram.currentDay;
                const existingProgrammeExercises = await prisma_1.prisma.programmeExercise.findMany({
                    where: {
                        programmeId: userProgram.programmeId,
                        dayNumber: currentDay,
                    },
                });
                const requestedExerciseIds = programmeExerciseUpdates
                    .map((update) => update.exerciseId)
                    .filter(Boolean);
                const idsToDelete = existingProgrammeExercises
                    .filter((existing) => !requestedExerciseIds.includes(existing.exerciseId))
                    .map((existing) => existing.id);
                if (idsToDelete.length > 0) {
                    await prisma_1.prisma.programmeExercise.deleteMany({
                        where: { id: { in: idsToDelete } },
                    });
                }
                for (const update of programmeExerciseUpdates) {
                    if (!update.exerciseId || update.sets <= 0) {
                        continue;
                    }
                    const existing = existingProgrammeExercises.find((exercise) => exercise.exerciseId === update.exerciseId);
                    if (existing) {
                        await prisma_1.prisma.programmeExercise.update({
                            where: { id: existing.id },
                            data: {
                                sets: update.sets,
                                reps: update.reps,
                                orderIndex: update.orderIndex,
                            },
                        });
                    }
                    else {
                        await prisma_1.prisma.programmeExercise.create({
                            data: {
                                programmeId: userProgram.programmeId,
                                exerciseId: update.exerciseId,
                                dayNumber: currentDay,
                                orderIndex: update.orderIndex,
                                sets: update.sets,
                                reps: update.reps,
                                isSelected: true,
                            },
                        });
                    }
                }
            }
        }
        // Save workout and get recommendations
        const result = await progressiveOverloadService_1.ProgressiveOverloadService.saveWorkoutAndCalculateProgression(userId, workoutData);
        // Update workout with duration if provided
        if (duration) {
            await prisma_1.prisma.workout.update({
                where: { id: result.workoutId },
                data: {
                    duration: parseInt(duration),
                    notes: notes || null,
                },
            });
        }
        console.log(`✅ Workout saved for user ${userId}, workout ID: ${result.workoutId}`);
        res.json({
            workoutId: result.workoutId,
            recommendations: result.recommendations,
            message: "Workout saved successfully",
        });
    }
    catch (error) {
        console.error("❌ Error saving workout:", error);
        res.status(500).json({
            error: "Failed to save workout",
            details: error instanceof Error ? error.message : "Unknown error",
        });
    }
});
// GET /auth/workouts/recommendations?exerciseIds=id1,id2,id3 - Get progression recommendations
router.get("/workouts/recommendations", authMiddleware_1.authenticateToken, async (req, res) => {
    const userId = req.user.userId;
    const exerciseIdsParam = req.query.exerciseIds;
    if (!exerciseIdsParam) {
        return res
            .status(400)
            .json({ error: "exerciseIds parameter is required" });
    }
    try {
        const exerciseIds = exerciseIdsParam.split(",").map((id) => id.trim());
        const setCountsParam = req.query.setCounts;
        const setCounts = setCountsParam
            ? setCountsParam.split(",").map((count) => parseInt(count, 10) || 3)
            : [];
        const recommendations = await progressiveOverloadService_1.ProgressiveOverloadService.getProgressionRecommendations(userId, exerciseIds, setCounts);
        res.json({ recommendations });
    }
    catch (error) {
        console.error("❌ Error getting recommendations:", error);
        res.status(500).json({
            error: "Failed to get recommendations",
            details: error instanceof Error ? error.message : "Unknown error",
        });
    }
});
// GET /auth/workouts/history/:exerciseId - Get workout history for specific exercise
router.get("/workouts/history/:exerciseId", authMiddleware_1.authenticateToken, async (req, res) => {
    const userId = req.user.userId;
    const { exerciseId } = req.params;
    const limit = parseInt(req.query.limit) || 10;
    try {
        const workoutHistory = await prisma_1.prisma.workoutSet.findMany({
            where: {
                workoutExercise: {
                    exerciseId,
                    workout: {
                        userProgram: {
                            userId,
                        },
                    },
                },
            },
            include: {
                workoutExercise: {
                    include: {
                        exercise: {
                            select: {
                                name: true,
                                muscleGroup: true,
                            },
                        },
                        workout: {
                            select: {
                                completedAt: true,
                                weekNumber: true,
                                dayNumber: true,
                            },
                        },
                    },
                },
            },
            orderBy: {
                workoutExercise: {
                    workout: {
                        completedAt: "desc",
                    },
                },
            },
            take: limit * 5, // Approximate sets per workout
        });
        // Group by workout session
        const groupedHistory = workoutHistory.reduce((acc, set) => {
            const workoutId = set.workoutExercise.id;
            if (!acc[workoutId]) {
                acc[workoutId] = {
                    date: set.workoutExercise.workout.completedAt,
                    weekNumber: set.workoutExercise.workout.weekNumber,
                    dayNumber: set.workoutExercise.workout.dayNumber,
                    exercise: {
                        name: set.workoutExercise.exercise.name,
                        muscleGroup: set.workoutExercise.exercise.muscleGroup,
                    },
                    sets: [],
                };
            }
            acc[workoutId].sets.push({
                setNumber: set.setNumber,
                weight: set.weight,
                reps: set.reps,
                rpe: set.rpe,
                completed: set.completed,
            });
            return acc;
        }, {});
        const history = Object.values(groupedHistory).slice(0, limit);
        res.json({ history });
    }
    catch (error) {
        console.error("❌ Error getting workout history:", error);
        res.status(500).json({
            error: "Failed to get workout history",
            details: error instanceof Error ? error.message : "Unknown error",
        });
    }
});
// GET /auth/workouts/stats/:exerciseId - Get performance stats for exercise
router.get("/workouts/stats/:exerciseId", authMiddleware_1.authenticateToken, async (req, res) => {
    const userId = req.user.userId;
    const { exerciseId } = req.params;
    try {
        const allSets = await prisma_1.prisma.workoutSet.findMany({
            where: {
                workoutExercise: {
                    exerciseId,
                    workout: {
                        userProgram: {
                            userId,
                        },
                    },
                },
                completed: true,
            },
            include: {
                workoutExercise: {
                    include: {
                        exercise: {
                            select: {
                                name: true,
                                muscleGroup: true,
                            },
                        },
                        workout: {
                            select: {
                                completedAt: true,
                            },
                        },
                    },
                },
            },
            orderBy: {
                workoutExercise: {
                    workout: {
                        completedAt: "asc",
                    },
                },
            },
        });
        if (allSets.length === 0) {
            return res.json({
                exerciseName: "Unknown",
                totalWorkouts: 0,
                totalSets: 0,
                totalVolume: 0,
                maxWeight: 0,
                maxReps: 0,
                maxVolume: 0,
                averageRpe: null,
                progressionData: [],
            });
        }
        // Calculate stats
        const totalSets = allSets.length;
        const totalVolume = allSets.reduce((sum, set) => sum + (set.weight ?? 0) * (set.reps ?? 0), 0);
        const maxWeight = Math.max(...allSets.map((set) => set.weight ?? 0));
        const maxReps = Math.max(...allSets.map((set) => set.reps ?? 0));
        const maxVolume = Math.max(...allSets.map((set) => (set.weight ?? 0) * (set.reps ?? 0)));
        const setsWithRpe = allSets.filter((set) => set.rpe !== null);
        const averageRpe = setsWithRpe.length > 0
            ? setsWithRpe.reduce((sum, set) => sum + set.rpe, 0) /
                setsWithRpe.length
            : null;
        // Group by workout for progression data (last 12 workouts)
        const workoutGroups = allSets.reduce((acc, set) => {
            const workoutDate = set.workoutExercise.workout.completedAt
                .toISOString()
                .split("T")[0];
            if (!acc[workoutDate]) {
                acc[workoutDate] = {
                    date: workoutDate,
                    sets: [],
                };
            }
            acc[workoutDate].sets.push(set);
            return acc;
        }, {});
        const progressionData = Object.values(workoutGroups)
            .slice(-12)
            .map((workout) => {
            const bestSet = workout.sets.reduce((best, current) => {
                const currentVolume = current.weight * current.reps;
                const bestVolume = best.weight * best.reps;
                return currentVolume > bestVolume ? current : best;
            });
            return {
                date: workout.date,
                maxWeight: Math.max(...workout.sets.map((s) => s.weight)),
                maxReps: Math.max(...workout.sets.map((s) => s.reps)),
                bestVolume: bestSet.weight * bestSet.reps,
                averageRpe: workout.sets.filter((s) => s.rpe).length > 0
                    ? workout.sets.reduce((sum, s) => sum + (s.rpe || 0), 0) / workout.sets.filter((s) => s.rpe).length
                    : null,
            };
        });
        const uniqueWorkouts = new Set(allSets.map((set) => set.workoutExercise.workout.completedAt.toISOString().split("T")[0])).size;
        res.json({
            exerciseName: allSets[0]?.workoutExercise.exercise.name || "Unknown",
            muscleGroup: allSets[0]?.workoutExercise.exercise.muscleGroup || "Unknown",
            totalWorkouts: uniqueWorkouts,
            totalSets,
            totalVolume,
            maxWeight,
            maxReps,
            maxVolume,
            averageRpe,
            progressionData,
        });
    }
    catch (error) {
        console.error("❌ Error getting workout stats:", error);
        res.status(500).json({
            error: "Failed to get workout stats",
            details: error instanceof Error ? error.message : "Unknown error",
        });
    }
});
// POST /auth/workouts/complete-day - Mark current day as complete and advance
router.post("/workouts/complete-day", authMiddleware_1.authenticateToken, async (req, res) => {
    const userId = req.user.userId;
    try {
        const userProgram = await prisma_1.prisma.userProgram.findFirst({
            where: {
                userId,
                status: "ACTIVE",
            },
            include: {
                programme: true,
            },
            orderBy: { createdAt: "desc" },
        });
        if (!userProgram) {
            return res.status(404).json({ error: "No active program found" });
        }
        // Program advancement already happened in POST /workouts
        // Just return the current progress
        const currentDay = userProgram.currentDay;
        const currentWeek = userProgram.currentWeek;
        console.log(`✅ User ${userId} workout completed. Current: Week ${currentWeek}, Day ${currentDay}`);
        res.json({
            currentWeek,
            currentDay,
            message: `Workout completed! Next session: Week ${currentWeek}, Day ${currentDay}`,
        });
    }
    catch (error) {
        console.error("❌ Error completing day:", error);
        res.status(500).json({
            error: "Failed to complete day",
            details: error instanceof Error ? error.message : "Unknown error",
        });
    }
});
// Add these endpoints to your auth.ts file
// PATCH /auth/user-programs/:id - Update user program status
router.patch("/user-programs/:id", authMiddleware_1.authenticateToken, async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    const userId = req.user.userId;
    try {
        // Verify this user program belongs to the user
        const userProgram = await prisma_1.prisma.userProgram.findFirst({
            where: {
                id,
                userId,
            },
        });
        if (!userProgram) {
            return res.status(404).json({ error: "User program not found" });
        }
        // Update status
        const updated = await prisma_1.prisma.userProgram.update({
            where: { id },
            data: {
                status,
                ...(status === "COMPLETED" || status === "CANCELLED"
                    ? { endDate: new Date() }
                    : {}),
            },
        });
        res.json(updated);
    }
    catch (error) {
        console.error("Error updating user program:", error);
        res.status(500).json({ error: "Failed to update user program" });
    }
});
router.delete("/programmes/:programmeId/exercises/day/:dayNumber", authMiddleware_1.authenticateToken, async (req, res) => {
    const { programmeId, dayNumber } = req.params;
    try {
        console.log(`🗑️ Deleting all exercises for programme ${programmeId}, day ${dayNumber}`);
        const deleted = await prisma_1.prisma.programmeExercise.deleteMany({
            where: {
                programmeId,
                dayNumber: parseInt(dayNumber),
            },
        });
        console.log(`✅ Deleted ${deleted.count} exercises`);
        res.json({
            success: true,
            deletedCount: deleted.count,
            message: `Deleted ${deleted.count} exercises from Day ${dayNumber}`,
        });
    }
    catch (error) {
        console.error("Error deleting day exercises:", error);
        res.status(500).json({ error: "Failed to delete exercises" });
    }
});
router.patch("/user-programs/:id", authMiddleware_1.authenticateToken, async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    const userId = req.user.userId;
    try {
        // Verify this user program belongs to the user
        const userProgram = await prisma_1.prisma.userProgram.findFirst({
            where: {
                id,
                userId,
            },
        });
        if (!userProgram) {
            return res.status(404).json({ error: "User program not found" });
        }
        // Update status
        const updated = await prisma_1.prisma.userProgram.update({
            where: { id },
            data: {
                status,
                ...(status === "COMPLETED" || status === "CANCELLED"
                    ? { endDate: new Date() }
                    : {}),
            },
        });
        res.json(updated);
    }
    catch (error) {
        console.error("Error updating user program:", error);
        res.status(500).json({ error: "Failed to update user program" });
    }
});
// Add these endpoints to your auth.ts file
// PATCH /auth/user-programs/:id - Update user program status
router.patch("/user-programs/:id", authMiddleware_1.authenticateToken, async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    const userId = req.user.userId;
    try {
        // Verify this user program belongs to the user
        const userProgram = await prisma_1.prisma.userProgram.findFirst({
            where: {
                id,
                userId,
            },
        });
        if (!userProgram) {
            return res.status(404).json({ error: "User program not found" });
        }
        // Update status
        const updated = await prisma_1.prisma.userProgram.update({
            where: { id },
            data: {
                status,
                ...(status === "COMPLETED" || status === "CANCELLED"
                    ? { endDate: new Date() }
                    : {}),
            },
        });
        res.json(updated);
    }
    catch (error) {
        console.error("Error updating user program:", error);
        res.status(500).json({ error: "Failed to update user program" });
    }
});
// Add these endpoints to your auth.ts file
// DELETE /auth/programmes/:programmeId/exercises/day/:dayNumber - Delete all exercises for a specific day
router.delete("/programmes/:programmeId/exercises/day/:dayNumber", authMiddleware_1.authenticateToken, async (req, res) => {
    const { programmeId, dayNumber } = req.params;
    try {
        console.log(`🗑️ Deleting all exercises for programme ${programmeId}, day ${dayNumber}`);
        const deleted = await prisma_1.prisma.programmeExercise.deleteMany({
            where: {
                programmeId,
                dayNumber: parseInt(dayNumber),
            },
        });
        console.log(`✅ Deleted ${deleted.count} exercises`);
        res.json({
            success: true,
            deletedCount: deleted.count,
            message: `Deleted ${deleted.count} exercises from Day ${dayNumber}`,
        });
    }
    catch (error) {
        console.error("Error deleting day exercises:", error);
        res.status(500).json({ error: "Failed to delete exercises" });
    }
});
// PATCH /auth/user-programs/:id - Update user program status
router.patch("/user-programs/:id", authMiddleware_1.authenticateToken, async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    const userId = req.user.userId;
    try {
        // Verify this user program belongs to the user
        const userProgram = await prisma_1.prisma.userProgram.findFirst({
            where: {
                id,
                userId,
            },
        });
        if (!userProgram) {
            return res.status(404).json({ error: "User program not found" });
        }
        // Update status
        const updated = await prisma_1.prisma.userProgram.update({
            where: { id },
            data: {
                status,
                ...(status === "COMPLETED" || status === "CANCELLED"
                    ? { endDate: new Date() }
                    : {}),
            },
        });
        res.json(updated);
    }
    catch (error) {
        console.error("Error updating user program:", error);
        res.status(500).json({ error: "Failed to update user program" });
    }
});
// Helper function to calculate current day based on start date
function calculateCurrentDay(startDate, daysPerWeek) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const daysSinceStart = Math.floor((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    // Determine day index within the 7-day programme week (startDate relative). Cap to daysPerWeek.
    const dayIndex = daysSinceStart % 7;
    const currentDay = Math.min(dayIndex + 1, daysPerWeek);
    return currentDay;
}
// Helper function to calculate current week
function calculateCurrentWeek(startDate, daysPerWeek) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const daysSinceStart = Math.floor((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    // Calculate current week based on fixed 7-day windows starting at programme start date
    const currentWeek = Math.floor(daysSinceStart / 7) + 1;
    return currentWeek;
}
// Add this endpoint to your auth.ts file
// GET /auth/workouts/weekly-stats - Get weekly workout statistics
router.get("/workouts/weekly-stats", authMiddleware_1.authenticateToken, async (req, res) => {
    const userId = req.user.userId;
    try {
        // Get active user program
        const userProgram = await prisma_1.prisma.userProgram.findFirst({
            where: {
                userId,
                status: "ACTIVE",
            },
            include: {
                programme: true,
            },
            orderBy: {
                createdAt: "desc",
            },
        });
        if (!userProgram) {
            return res.json({
                workoutsCompleted: 0,
                workoutsTarget: 0,
                dailyStats: [],
                totalSets: 0,
                totalExercises: 0,
            });
        }
        // Calculate the start of the current week (Monday)
        const now = new Date();
        const dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
        const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Adjust so Monday is start
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - daysToMonday);
        weekStart.setHours(0, 0, 0, 0);
        // Get workouts from this week
        const workouts = await prisma_1.prisma.workout.findMany({
            where: {
                userProgramId: userProgram.id,
                completedAt: {
                    gte: weekStart,
                },
            },
            include: {
                exercises: {
                    include: {
                        sets: {
                            where: {
                                completed: true,
                            },
                        },
                        exercise: true,
                    },
                },
            },
            orderBy: {
                completedAt: "asc",
            },
        });
        // Create array for last 7 days
        const dailyStats = [];
        const dayNames = [
            "Monday",
            "Tuesday",
            "Wednesday",
            "Thursday",
            "Friday",
            "Saturday",
            "Sunday",
        ];
        for (let i = 0; i < 7; i++) {
            const date = new Date(weekStart);
            date.setDate(weekStart.getDate() + i);
            // Find workouts for this day
            const dayWorkouts = workouts.filter((w) => {
                const workoutDate = new Date(w.completedAt);
                return workoutDate.toDateString() === date.toDateString();
            });
            // Calculate stats for this day
            let sets = 0;
            const uniqueExercises = new Set();
            dayWorkouts.forEach((workout) => {
                workout.exercises.forEach((exercise) => {
                    sets += exercise.sets.length;
                    uniqueExercises.add(exercise.exerciseId);
                });
            });
            dailyStats.push({
                date: date.toISOString(),
                dayName: dayNames[i],
                sets,
                exercises: uniqueExercises.size,
            });
        }
        // Calculate totals
        const totalSets = dailyStats.reduce((sum, day) => sum + day.sets, 0);
        const totalExercises = dailyStats.reduce((sum, day) => sum + day.exercises, 0);
        // Count unique workout days (days with at least one set)
        const workoutsCompleted = dailyStats.filter((day) => day.sets > 0).length;
        const workoutsTarget = userProgram.programme.daysPerWeek;
        res.json({
            workoutsCompleted,
            workoutsTarget,
            dailyStats,
            totalSets,
            totalExercises,
        });
    }
    catch (error) {
        console.error("❌ Error fetching weekly stats:", error);
        res.status(500).json({
            error: "Failed to fetch weekly stats",
            details: error instanceof Error ? error.message : "Unknown error",
        });
    }
});
// Add these endpoints to your auth.ts file
// GET /auth/metrics/bodyweight - Get bodyweight history
router.get("/metrics/bodyweight", authMiddleware_1.authenticateToken, async (req, res) => {
    const userId = req.user.userId;
    try {
        const entries = await prisma_1.prisma.bodyweightEntry.findMany({
            where: { userId },
            orderBy: { date: "desc" },
            take: 50, // Last 50 entries
        });
        res.json(entries);
    }
    catch (error) {
        console.error("Error fetching bodyweight history:", error);
        res.status(500).json({ error: "Failed to fetch bodyweight history" });
    }
});
// POST /auth/metrics/bodyweight - Add bodyweight entry
router.post("/metrics/bodyweight", authMiddleware_1.authenticateToken, async (req, res) => {
    const userId = req.user.userId;
    const { weight } = req.body;
    if (!weight || weight <= 0) {
        return res.status(400).json({ error: "Valid weight is required" });
    }
    try {
        const entry = await prisma_1.prisma.bodyweightEntry.create({
            data: {
                userId,
                weight: parseFloat(weight),
                date: new Date(),
            },
        });
        // Also update user profile with latest weight
        await prisma_1.prisma.user.update({
            where: { id: userId },
            data: { bodyweight: parseFloat(weight) },
        });
        res.json(entry);
    }
    catch (error) {
        console.error("Error adding bodyweight entry:", error);
        res.status(500).json({ error: "Failed to add bodyweight entry" });
    }
});
// GET /auth/metrics/bodyfat - Get body fat history
router.get("/metrics/bodyfat", authMiddleware_1.authenticateToken, async (req, res) => {
    const userId = req.user.userId;
    try {
        const entries = await prisma_1.prisma.bodyfatEntry.findMany({
            where: { userId },
            orderBy: { date: "desc" },
            take: 50, // Last 50 entries
        });
        res.json(entries);
    }
    catch (error) {
        console.error("Error fetching bodyfat history:", error);
        res.status(500).json({ error: "Failed to fetch bodyfat history" });
    }
});
// POST /auth/metrics/bodyfat - Add body fat entry
router.post("/metrics/bodyfat", authMiddleware_1.authenticateToken, async (req, res) => {
    const userId = req.user.userId;
    const { bodyfat } = req.body;
    if (!bodyfat || bodyfat <= 0 || bodyfat > 100) {
        return res
            .status(400)
            .json({ error: "Valid body fat percentage (0-100) is required" });
    }
    try {
        const entry = await prisma_1.prisma.bodyfatEntry.create({
            data: {
                userId,
                bodyfat: parseFloat(bodyfat),
                date: new Date(),
            },
        });
        res.json(entry);
    }
    catch (error) {
        console.error("Error adding bodyfat entry:", error);
        res.status(500).json({ error: "Failed to add bodyfat entry" });
    }
});
// PUT /auth/metrics/bodyweight/:id - Update bodyweight entry
router.put("/metrics/bodyweight/:id", authMiddleware_1.authenticateToken, async (req, res) => {
    const userId = req.user.userId;
    const { id } = req.params;
    const { weight } = req.body;
    if (!weight || weight <= 0) {
        return res.status(400).json({ error: "Valid weight is required" });
    }
    try {
        // Verify ownership
        const entry = await prisma_1.prisma.bodyweightEntry.findUnique({
            where: { id },
        });
        if (!entry || entry.userId !== userId) {
            return res.status(403).json({ error: "Unauthorized" });
        }
        const updatedEntry = await prisma_1.prisma.bodyweightEntry.update({
            where: { id },
            data: {
                weight: parseFloat(weight),
            },
        });
        res.json(updatedEntry);
    }
    catch (error) {
        console.error("Error updating bodyweight entry:", error);
        res.status(500).json({ error: "Failed to update bodyweight entry" });
    }
});
// DELETE /auth/metrics/bodyweight/:id - Delete bodyweight entry
router.delete("/metrics/bodyweight/:id", authMiddleware_1.authenticateToken, async (req, res) => {
    const userId = req.user.userId;
    const { id } = req.params;
    try {
        // Verify ownership
        const entry = await prisma_1.prisma.bodyweightEntry.findUnique({
            where: { id },
        });
        if (!entry || entry.userId !== userId) {
            return res.status(403).json({ error: "Unauthorized" });
        }
        await prisma_1.prisma.bodyweightEntry.delete({
            where: { id },
        });
        res.json({ success: true });
    }
    catch (error) {
        console.error("Error deleting bodyweight entry:", error);
        res.status(500).json({ error: "Failed to delete bodyweight entry" });
    }
});
// PUT /auth/metrics/bodyfat/:id - Update bodyfat entry
router.put("/metrics/bodyfat/:id", authMiddleware_1.authenticateToken, async (req, res) => {
    const userId = req.user.userId;
    const { id } = req.params;
    const { bodyfat } = req.body;
    if (!bodyfat || bodyfat <= 0 || bodyfat > 100) {
        return res
            .status(400)
            .json({ error: "Valid body fat percentage (0-100) is required" });
    }
    try {
        // Verify ownership
        const entry = await prisma_1.prisma.bodyfatEntry.findUnique({
            where: { id },
        });
        if (!entry || entry.userId !== userId) {
            return res.status(403).json({ error: "Unauthorized" });
        }
        const updatedEntry = await prisma_1.prisma.bodyfatEntry.update({
            where: { id },
            data: {
                bodyfat: parseFloat(bodyfat),
            },
        });
        res.json(updatedEntry);
    }
    catch (error) {
        console.error("Error updating bodyfat entry:", error);
        res.status(500).json({ error: "Failed to update bodyfat entry" });
    }
});
// DELETE /auth/metrics/bodyfat/:id - Delete bodyfat entry
router.delete("/metrics/bodyfat/:id", authMiddleware_1.authenticateToken, async (req, res) => {
    const userId = req.user.userId;
    const { id } = req.params;
    try {
        // Verify ownership
        const entry = await prisma_1.prisma.bodyfatEntry.findUnique({
            where: { id },
        });
        if (!entry || entry.userId !== userId) {
            return res.status(403).json({ error: "Unauthorized" });
        }
        await prisma_1.prisma.bodyfatEntry.delete({
            where: { id },
        });
        res.json({ success: true });
    }
    catch (error) {
        console.error("Error deleting bodyfat entry:", error);
        res.status(500).json({ error: "Failed to delete bodyfat entry" });
    }
});
// GET /auth/metrics/personal-records - Get personal records across all exercises
router.get("/metrics/personal-records", authMiddleware_1.authenticateToken, async (req, res) => {
    const userId = req.user.userId;
    try {
        // Get all completed workout sets for this user
        const workoutSets = await prisma_1.prisma.workoutSet.findMany({
            where: {
                completed: true,
                workoutExercise: {
                    workout: {
                        userProgram: {
                            userId,
                        },
                    },
                },
            },
            include: {
                workoutExercise: {
                    include: {
                        exercise: true,
                        workout: true,
                    },
                },
            },
            orderBy: {
                createdAt: "desc",
            },
        });
        // For each exercise, compute best recorded weight for reps 1,2,3,5,10
        const targets = [1, 2, 3, 5, 10];
        const exerciseMap = new Map();
        workoutSets.forEach((set) => {
            const exerciseId = set.workoutExercise.exerciseId;
            const exerciseName = set.workoutExercise.exercise.name;
            const muscleGroup = set.workoutExercise.exercise.muscleGroup;
            const weight = set.weight || 0;
            const reps = set.reps || 0;
            const date = set.workoutExercise.workout.completedAt;
            if (!exerciseMap.has(exerciseId)) {
                const prs = {
                    1: null,
                    2: null,
                    3: null,
                    5: null,
                    10: null,
                };
                exerciseMap.set(exerciseId, {
                    exerciseId,
                    exerciseName,
                    muscleGroup,
                    prs,
                });
            }
            const record = exerciseMap.get(exerciseId);
            if (targets.includes(reps)) {
                const existing = record.prs[reps];
                if (!existing || weight > existing.weight) {
                    record.prs[reps] = { weight, date };
                }
            }
        });
        // Convert to array and sort by muscle group then exercise name
        const personalRecords = Array.from(exerciseMap.values())
            .map((r) => ({
            exerciseId: r.exerciseId,
            exerciseName: r.exerciseName,
            muscleGroup: r.muscleGroup,
            prs: r.prs,
        }))
            .sort((a, b) => {
            if (a.muscleGroup !== b.muscleGroup)
                return a.muscleGroup.localeCompare(b.muscleGroup);
            return a.exerciseName.localeCompare(b.exerciseName);
        });
        res.json(personalRecords);
    }
    catch (error) {
        console.error("Error fetching personal records:", error);
        res.status(500).json({ error: "Failed to fetch personal records" });
    }
});
exports.default = router;
