const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function checkKeys() {
    try {
        console.log('Checking API keys for ALL users...\n');
        const usersSnapshot = await db.collection('users').get();

        if (usersSnapshot.empty) {
            console.log('No users found.');
            return;
        }

        for (const userDoc of usersSnapshot.docs) {
            const userId = userDoc.id;
            const userData = userDoc.data();
            console.log(`User: ${userId} (${userData.email || 'No email'})`);

            const settingsDoc = await db.collection('users').doc(userId).collection('settings').doc('openai').get();

            if (!settingsDoc.exists) {
                console.log('  ❌ No API key settings doc');
            } else {
                const apiKey = settingsDoc.data().apiKey || '';
                if (!apiKey) {
                    console.log('  ❌ API key field is empty');
                } else {
                    console.log(`  🔑 Key: ${apiKey.substring(0, 15)}...`);
                    if (apiKey.startsWith('sk-')) {
                        console.log('  ✅ Format: Valid');
                    } else {
                        console.log('  ❌ Format: INVALID');
                    }
                }
            }
            console.log('---');
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

checkKeys();
