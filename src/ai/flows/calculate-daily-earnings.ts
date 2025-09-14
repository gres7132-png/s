
'use server';

/**
 * @fileOverview A secure backend flow for calculating and crediting daily earnings for all users.
 * This flow is designed to be run once daily by a scheduled job (cron).
 * It now uses a more robust two-step process: reset all earnings, then credit new earnings.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { getFirestore, FieldValue, WriteBatch } from 'firebase-admin/firestore';
import { getApps } from 'firebase-admin/app';

const CalculateEarningsOutputSchema = z.object({
    success: z.boolean(),
    processedUsers: z.number(),
    totalEarningsCredited: z.number(),
    usersReset: z.number(),
});

type CalculateEarningsOutput = z.infer<typeof CalculateEarningsOutputSchema>;


// Helper to commit batches in chunks of 500, which is Firestore's limit
async function commitBatchInChunks(db: FirebaseFirestore.Firestore, docsToUpdate: FirebaseFirestore.DocumentReference[], updateData: any) {
    let chunks: FirebaseFirestore.DocumentReference[][] = [];
    for (let i = 0; i < docsToUpdate.length; i += 500) {
        chunks.push(docsToUpdate.slice(i, i + 500));
    }
    for (const chunk of chunks) {
        const batch: WriteBatch = db.batch();
        chunk.forEach(docRef => {
            batch.update(docRef, updateData);
        });
        await batch.commit();
    }
}

async function calculateAndCreditEarnings(): Promise<CalculateEarningsOutput> {
    if (!getApps().length) {
        throw new Error("Admin SDK is not configured. The user management flow must be initialized first.");
    }
    console.log("Starting daily earnings calculation...");
    
    const db = getFirestore();
    
    // --- STEP 1: Reset `todaysEarnings` for ALL users to 0 ---
    console.log("Resetting todaysEarnings for all users...");
    const allUsersStatsSnapshot = await db.collection('userStats').where('todaysEarnings', '>', 0).get();
    const docsToReset = allUsersStatsSnapshot.docs.map(doc => doc.ref);
    if(docsToReset.length > 0) {
        await commitBatchInChunks(db, docsToReset, { todaysEarnings: 0 });
    }
    console.log(`Reset complete for ${docsToReset.length} users.`);


    // --- STEP 2: Calculate and credit new earnings ---
    const earningsByUid: { [key: string]: number } = {};
    const investmentsSnapshot = await db.collectionGroup('investments').where('status', '==', 'active').get();
    
    if (investmentsSnapshot.empty) {
        console.log("No active investments found. Nothing to process.");
        return { success: true, processedUsers: 0, totalEarningsCredited: 0, usersReset: docsToReset.length };
    }

    investmentsSnapshot.forEach(doc => {
        const investment = doc.data();
        const userId = doc.ref.parent.parent!.id;
        if (userId && investment.dailyReturn) {
            earningsByUid[userId] = (earningsByUid[userId] || 0) + investment.dailyReturn;
        }
    });

    const creditBatch = db.batch();
    let totalCredited = 0;
    const userIdsWithEarningsToday = Object.keys(earningsByUid);

    for (const userId of userIdsWithEarningsToday) {
        const userStatsRef = db.doc(`userStats/${userId}`);
        const dailyEarning = earningsByUid[userId];
        
        creditBatch.set(userStatsRef, {
            availableBalance: FieldValue.increment(dailyEarning),
            todaysEarnings: dailyEarning // This is an increment because we reset to 0 before.
        }, { merge: true });
        
        totalCredited += dailyEarning;
    }
    
    await creditBatch.commit();
    
    console.log(`Successfully processed earnings for ${userIdsWithEarningsToday.length} users.`);
    return {
        success: true,
        processedUsers: userIdsWithEarningsToday.length,
        totalEarningsCredited: totalCredited,
        usersReset: docsToReset.length,
    };
}


export const calculateAllUserEarnings = ai.defineFlow(
  {
    name: 'calculateAllUserEarnings',
    outputSchema: CalculateEarningsOutputSchema,
  },
  calculateAndCreditEarnings
);
