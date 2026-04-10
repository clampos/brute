"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const dotenv_1 = __importDefault(require("dotenv"));
const cors_1 = __importDefault(require("cors"));
const body_parser_1 = __importDefault(require("body-parser"));
const auth_1 = __importDefault(require("./auth"));
const protected_1 = __importDefault(require("./protected"));
const webhook_1 = __importDefault(require("./webhook"));
const path_1 = __importDefault(require("path"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = 4242;
app.use((0, cors_1.default)());
// ✅ Route-mounted raw body handler
app.use('/webhook', webhook_1.default);
// Serve static files for profile photos
// Serve static files for profile photos
app.use('/uploads', express_1.default.static(path_1.default.join(__dirname, '../../uploads')));
// ✅ All other routes use JSON parsing
app.use(body_parser_1.default.json());
app.use('/auth', auth_1.default);
app.use('/api', protected_1.default);
app.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
});
