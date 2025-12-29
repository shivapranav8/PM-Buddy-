const admin = require('firebase-admin');
const fs = require('fs');
const serviceAccount = require('./serviceAccountKey.json');

// Initialize Firebase
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}
const db = admin.firestore();

async function fetchTraces() {
    console.log('Fetching last 20 interviews...');
    try {
        const interviewsSnap = await db.collection('interviews')
            .orderBy('startTime', 'desc')
            .limit(20)
            .get();

        if (interviewsSnap.empty) {
            console.log('No interviews found.');
            return;
        }

        const traces = [];

        for (const doc of interviewsSnap.docs) {
            const interviewData = doc.data();
            const interviewId = doc.id;
            console.log(`Processing ${interviewId}...`);

            const messagesSnap = await db.collection('interviews')
                .doc(interviewId)
                .collection('messages')
                .orderBy('timestamp', 'asc')
                .get();

            const messages = messagesSnap.docs.map(m => ({
                sender: m.data().sender, // 'user' or 'ai'
                text: m.data().text,
                timestamp: m.data().timestamp ? m.data().timestamp.toDate() : null
            }));

            traces.push({
                interviewId,
                roundType: interviewData.roundType,
                difficulty: interviewData.difficulty,
                messages
            });
        }

        fs.writeFileSync('traces.json', JSON.stringify(traces, null, 2));
        console.log(`Saved ${traces.length} traces to traces.json`);
        process.exit(0);

    } catch (error) {
        console.error('Error fetching traces:', error);
        process.exit(1);
    }
}

fetchTraces();
