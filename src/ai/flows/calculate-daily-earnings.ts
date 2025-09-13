
'use server';

/**
 * @fileOverview A secure backend flow for calculating and crediting daily earnings for all users.
 * This flow is designed to be run once daily by a scheduled job (cron).
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getApps, initializeApp, cert } from 'firebase-admin/app';

// Initialize Firebase Admin SDK
if (!getApps().length) {
  if (!process.env.FIREBASE_ADMIN_SDK_CONFIG) {
    console.error("FIREBASE_ADMIN_SDK_CONFIG environment variable is not set.");
  } else {
    try {
      initializeApp({
        credential: cert(JSON.parse(process.env.FIREBASE_ADMIN_SDK_CONFIG))
      });
    } catch (e: any) {
      console.error("Admin SDK initialization failed:", e.message);
    }
  }
}

const CalculateEarningsOutputSchema = z.object({
    success: z.boolean(),
    processedUsers: z.number(),
    totalEarningsCredited: z.number(),
});

type CalculateEarningsOutput = z.infer<typeof CalculateEarningsOutputSchema>;

async function calculateAndCreditEarnings(): Promise<CalculateEarningsOutput> {
    if (!getApps().length) {
        throw new Error("Admin SDK is not configured. Check server environment variables.");
    }
    console.log("Starting daily earnings calculation...");
    
    const db = getFirestore();
    const earningsByUid: { [key: string]: number } = {};

    // 1. Fetch all active investments across all users
    const investmentsSnapshot = await db.collectionGroup('investments').where('status', '==', 'active').get();
    
    if (investmentsSnapshot.empty) {
        console.log("No active investments found. Nothing to process.");
        return { success: true, processedUsers: 0, totalEarningsCredited: 0 };
    }

    // 2. Sum up daily returns for each user
    investmentsSnapshot.forEach(doc => {
        const investment = doc.data();
        const userId = doc.ref.parent.parent!.id; // Get the userId from the path
        if (userId && investment.dailyReturn) {
            earningsByUid[userId] = (earningsByUid[userId] || 0) + investment.dailyReturn;
        }
    });

    // 3. Use a batch write to update all users' stats atomically
    const batch = db.batch();
    let totalCredited = 0;
    const userIdsWithEarningsToday = Object.keys(earningsByUid);

    for (const userId of userIdsWithEarningsToday) {
        const userStatsRef = db.doc(`userStats/${userId}`);
        const dailyEarning = earningsByUid[userId];
        
        // This is now an atomic operation, preventing race conditions.
        batch.set(userStatsRef, {
            availableBalance: FieldValue.increment(dailyEarning),
            todaysEarnings: dailyEarning // Set, not increment, to reflect today's specific earnings
        }, { merge: true });
        
        totalCredited += dailyEarning;
    }
    
    // 4. Asynchronously find users who had earnings yesterday but not today, and reset their earnings to 0.
    const allUsersWithOldEarningsSnapshot = await db.collection('userStats').where('todaysEarnings', '>', 0).get();
    allUsersWithOldEarningsSnapshot.forEach(doc => {
        if (!userIdsWithEarningsToday.includes(doc.id)) {
            batch.update(doc.ref, { todaysEarnings: 0 });
        }
    });

    await batch.commit();
    
    console.log(`Successfully processed earnings for ${userIdsWithEarningsToday.length} users.`);
    return {
        success: true,
        processedUsers: userIdsWithEarningsToday.length,
        totalEarningsCredited: totalCredited
    };
}


export const calculateAllUserEarnings = ai.defineFlow(
  {
    name: 'calculateAllUserEarnings',
    outputSchema: CalculateEarningsOutputSchema,
  },
  calculateAndCreditEarnings
);

