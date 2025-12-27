const admin = require('firebase-admin');
const serviceAccount = require('./server/serviceAccountKey.json');

// Initialize Firebase Admin
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function checkAPIKey() {
    try {
        console.log('Checking API keys for ALL users...\n');

        const usersSnapshot = await db.collection('users').get();

        if (usersSnapshot.empty) {
            console.log('No users found in Firestore.');
            process.exit(0);
        }

        for (const userDoc of usersSnapshot.docs) {
            const userId = userDoc.id;
            const userData = userDoc.data();
            console.log(`User: ${userId} (${userData.email || 'No email'})`);

            const settingsDoc = await db.collection('users').doc(userId).collection('settings').doc('openai').get();

            if (!settingsDoc.exists) {
                console.log('  ❌ No API key settings doc found');
            } else {
                const data = settingsDoc.data();
                const apiKey = data.apiKey || '';

                if (!apiKey) {
                    console.log('  ❌ API key field is empty');
                } else {
                    console.log(`  🔑 Key: ${apiKey.substring(0, 15)}...`);
                    if (apiKey.startsWith('sk-')) {
                        console.log('  ✅ Format: Valid (starts with sk-)');
                    } else {
                        console.log('  ❌ Format: INVALID');
                    }
                }
            }
            console.log('---');
        }

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

checkAPIKey();
