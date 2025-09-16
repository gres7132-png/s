
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
import '@/ai/flows/user-management'; // Ensures Admin SDK is initialized

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
    return getReferralDataFlow();
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

        // This commission is for display purposes on the referral page.
        // The actual commission is now handled by the approveDeposit flow.
        const commission = 0; // Set to 0 as commission is now deposit-based.
        totalCommissionEarned += commission;

        return {
            id: referredUserId,
            displayName: referredUserData.displayName || 'Unknown User',
            capital: totalInvested,
            commissionEarned: commission,
            status: referredUserData.hasActiveInvestment ? 'Active' : 'Pending' as 'Active' | 'Pending',
        };
    }));

    return {
        referredUsers: referredUsersData,
        totalCommissionEarned: totalCommissionEarned,
    };
  }
);

// --- Contributor Page Data ---

const ContributorDataSchema = z.object({
    activeReferralsCount: z.number(),
    userBalance: z.number(),
});
export type ContributorData = z.infer<typeof ContributorDataSchema>;

/**
 * A secure flow to get prerequisite data for the Contributor Page.
 */
export async function getContributorData(): Promise<ContributorData> {
    return getContributorDataFlow();
}

const getContributorDataFlow = ai.defineFlow(
  {
    name: 'getContributorDataFlow',
    outputSchema: ContributorDataSchema,
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

    // Get user's balance
    const userStatsRef = db.doc(`userStats/${userId}`);
    const userStatsDoc = await userStatsRef.get();
    const userBalance = userStatsDoc.exists() ? userStatsDoc.data()?.availableBalance || 0 : 0;
    
    // Get count of active referrals
    const referralsQuery = db.collection("users")
        .where("referredBy", "==", userId)
        .where("hasActiveInvestment", "==", true);
    const referralsSnapshot = await referralsQuery.get();
    const activeReferralsCount = referralsSnapshot.size;

    return {
        userBalance,
        activeReferralsCount,
    };
  }
);

    