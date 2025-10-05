import express from 'express';
import router from './routes/routes.js';
import * as dotenv from 'dotenv';

dotenv.config();

const PORT = process.env.PORT || 5000;
const app = express();

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files
app.use(express.static("public"));

// Routes
app.use('/', router);

console.log('🚀 Starting ColabNotes server...');
console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);

app.listen(PORT, () => {
    console.log(`✅ Server running on port ${PORT}`);
    console.log(`🔐 JWT Auth test: http://localhost:${PORT}/test/jwt-auth`);
    console.log(`🔍 Google Auth test: http://localhost:${PORT}/test/google-auth`);
});