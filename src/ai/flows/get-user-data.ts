
'use server';

/**
 * @fileOverview Secure backend flows for fetching user-specific data.
 * This file centralizes data retrieval logic that requires aggregated or sensitive lookups,
 * ensuring that client-side code doesn't need broad read permissions on the database.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { getFirestore } from 'firebase-admin/firestore';
import { getApps } from 'firebase-admin/app';

// --- Referral Data Flow ---

const ReferredUserSchema = z.object({
  id: z.string(),
  displayName: z.string(),
  capital: z.number(),
  commissionEarned: z.number(),
  status: z.enum(['Active', 'Pending']),
});

const ReferralDataSchema = z.object({
    referredUsers: z.array(ReferredUserSchema),
    totalCommissionEarned: z.number(),
});
export type ReferralData = z.infer<typeof ReferralDataSchema>;

/**
 * A secure flow to get all referral data for the currently authenticated user.
 * It calculates total invested capital and commissions for each referred user.
 */
export async function getReferralData(): Promise<ReferralData> {
    return getReferralDataFlow({});
}

const getReferralDataFlow = ai.defineFlow(
  {
    name: 'getReferralDataFlow',
    outputSchema: ReferralDataSchema,
    auth: { user: true }
  },
  async (input, { auth }) => {
    if (!auth) {
        throw new Error("Authentication is required.");
    }
    if (!getApps().length) {
        throw new Error("Admin SDK is not configured.");
    }

    const db = getFirestore();
    const userId = auth.uid;

    const referredUsersQuery = db.collection('users').where('referredBy', '==', userId);
    const snapshot = await referredUsersQuery.get();

    if (snapshot.empty) {
        return { referredUsers: [], totalCommissionEarned: 0 };
    }

    let totalCommissionEarned = 0;

    const referredUsersData = await Promise.all(snapshot.docs.map(async (userDoc) => {
        const referredUserId = userDoc.id;
        const referredUserData = userDoc.data();

        const investmentsColRef = db.collection(`users/${referredUserId}/investments`);
        const investmentsSnapshot = await investmentsColRef.get();
        
        let totalInvested = 0;
        investmentsSnapshot.forEach(investmentDoc => {
            totalInvested += investmentDoc.data().price || 0;
        });

        const commission = totalInvested * 0.05; // 5% commission
        totalCommissionEarned += commission;

        return {
            id: referredUserId,
            displayName: referredUserData.displayName || 'Unknown User',
            capital: totalInvested,
            commissionEarned: commission,
            status: totalInvested > 0 ? 'Active' : 'Pending' as 'Active' | 'Pending',
        };
    }));

    return {
        referredUsers: referredUsersData,
        totalCommissionEarned: totalCommissionEarned,
    };
  }
);
