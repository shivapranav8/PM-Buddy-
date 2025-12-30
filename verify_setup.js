const fs = require('fs');
const path = require('path');

console.log("Verifying PM Interview Buddy Setup...");

// Check Backend Config
const serviceAccountPath = path.join(__dirname, 'server', 'serviceAccountKey.json');
const envPath = path.join(__dirname, 'server', '.env');

if (fs.existsSync(serviceAccountPath)) {
    const content = fs.readFileSync(serviceAccountPath, 'utf8');
    if (content.includes('YOUR_PROJECT_ID')) {
        console.warn("⚠️  server/serviceAccountKey.json contains placeholder values. Please replace them with your actual Firebase Service Account Key.");
    } else {
        console.log("✅ server/serviceAccountKey.json found.");
    }
} else {
    console.error("❌ server/serviceAccountKey.json is missing.");
}

if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8');
    if (content.includes('your_openai_api_key_here')) {
        console.warn("⚠️  server/.env contains placeholder values. Please add your OpenAI API Key.");
    } else {
        console.log("✅ server/.env found.");
    }
} else {
    console.error("❌ server/.env is missing.");
}

// Check Frontend Config
const firebaseConfigPath = path.join(__dirname, 'src', 'firebase.ts');
if (fs.existsSync(firebaseConfigPath)) {
    const content = fs.readFileSync(firebaseConfigPath, 'utf8');
    if (content.includes('YOUR_API_KEY')) {
        console.warn("⚠️  src/firebase.ts contains placeholder values. Please add your Firebase Web Config.");
    } else {
        console.log("✅ src/firebase.ts found.");
    }
} else {
    console.error("❌ src/firebase.ts is missing.");
}

console.log("\nNext Steps:");
console.log("1. Update the configuration files mentioned above.");
console.log("2. In one terminal, run: cd server && npm start");
console.log("3. In another terminal, run: npm run dev");
console.log("4. Open the app, sign in, and start an interview!");
