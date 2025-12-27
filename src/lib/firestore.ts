import { db } from "../firebase";
import {
    collection,
    addDoc,
    serverTimestamp,
    onSnapshot,
    query,
    orderBy,
    doc,
    updateDoc
} from "firebase/firestore";

export const startInterview = async (userId: string, category: string, difficulty: string = 'MEDIUM') => {
    try {
        const docRef = await addDoc(collection(db, "interviews"), {
            userId,
            roundType: category,  // Changed from 'category' to 'roundType'
            difficulty: difficulty.toUpperCase(),  // Add difficulty
            status: "active",
            startTime: serverTimestamp(),
        });
        return docRef.id;
    } catch (e) {
        console.error("Error starting interview: ", e);
        throw e;
    }
};

export const sendMessage = async (interviewId: string, text: string, sender: 'user' | 'ai') => {
    try {
        await addDoc(collection(db, "interviews", interviewId, "messages"), {
            text,
            sender,
            timestamp: serverTimestamp(),
        });
    } catch (e) {
        console.error("Error sending message: ", e);
        throw e;
    }
};

export const endInterview = async (interviewId: string) => {
    try {
        const interviewRef = doc(db, "interviews", interviewId);
        await updateDoc(interviewRef, {
            status: "completed",
            endTime: serverTimestamp()
        });
    } catch (e) {
        console.error("Error ending interview: ", e);
        throw e;
    }
}

export const subscribeToMessages = (interviewId: string, callback: (messages: any[]) => void) => {
    const q = query(
        collection(db, "interviews", interviewId, "messages"),
        orderBy("timestamp", "asc")
    );

    return onSnapshot(q, (snapshot) => {
        const messages = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        callback(messages);
    });
};
