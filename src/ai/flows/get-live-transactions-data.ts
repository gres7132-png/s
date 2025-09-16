
'use server';

/**
 * @fileOverview A secure backend flow for fetching data needed for the live transactions feed.
 * This flow queries for a sample of real users, package prices, and recent approved transactions.
 */

import '@/ai/flows/user-management'; // Ensures Admin SDK is initialized
import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { getApps } from 'firebase-admin/app';

const UserSchema = z.object({
  displayName: z.string(),
});

const RecentTransactionSchema = z.object({
    type: z.enum(['Deposit', 'Withdrawal']),
    userName: z.string(),
    amount: z.number(),
    timestamp: z.string(), // ISO string
});

const LiveTransactionsDataSchema = z.object({
    users: z.array(UserSchema),
    packagePrices: z.array(z.number()),
    recentTransactions: z.array(RecentTransactionSchema),
});
export type LiveTransactionsData = z.infer<typeof LiveTransactionsDataSchema>;

/**
 * A secure flow to get data for the live transactions component.
 * It fetches a sample of real user display names, investment package prices,
 * and the 10 most recent approved transactions.
 */
export async function getLiveTransactionsData(): Promise<LiveTransactionsData> {
    return getLiveTransactionsDataFlow();
}

const getLiveTransactionsDataFlow = ai.defineFlow(
  {
    name: 'getLiveTransactionsDataFlow',
    outputSchema: LiveTransactionsDataSchema,
    auth: { user: true } // Secure this endpoint to logged-in users
  },
  async () => {
    if (!getApps().length) {
        throw new Error("Admin SDK is not configured.");
    }

    const db = getFirestore();

    // --- Fetch Sample Data for Bot Generation ---
    const usersQuery = db.collection('users').limit(20);
    const usersSnapshot = await usersQuery.get();
    const users = usersSnapshot.docs.map(doc => ({ displayName: doc.data().displayName || 'Anonymous' }));

    const packagesQuery = db.collection('silverLevelPackages');
    const packagesSnapshot = await packagesQuery.get();
    const packagePrices = packagesSnapshot.docs.map(doc => doc.data().price || 0);

    // --- Fetch Real Recent Transactions ---
    const approvedDepositsQuery = db.collection('transactionProofs')
        .where('status', '==', 'approved')
        .orderBy('submittedAt', 'desc')
        .limit(5);

    const approvedWithdrawalsQuery = db.collection('withdrawalRequests')
        .where('status', '==', 'approved')
        .orderBy('requestedAt', 'desc')
        .limit(5);

    const [depositsSnapshot, withdrawalsSnapshot] = await Promise.all([
        approvedDepositsQuery.get(),
        approvedWithdrawalsQuery.get(),
    ]);

    const userPromises: Promise<any>[] = [];
    
    const deposits = depositsSnapshot.docs.map(doc => {
        const data = doc.data();
        userPromises.push(db.doc(`users/${data.userId}`).get());
        return {
            type: 'Deposit' as const,
            userId: data.userId,
            amount: data.amount,
            timestamp: (data.submittedAt as Timestamp).toDate().toISOString(),
        };
    });

    const withdrawals = withdrawalsSnapshot.docs.map(doc => {
        const data = doc.data();
        userPromises.push(db.doc(`users/${data.userId}`).get());
        return {
            type: 'Withdrawal' as const,
            userId: data.userId,
            amount: data.amount,
            timestamp: (data.requestedAt as Timestamp).toDate().toISOString(),
        };
    });

    const userDocs = await Promise.all(userPromises);
    const userMap = new Map(userDocs.map(doc => [doc.id, doc.data()?.displayName || 'Anonymous']));

    const recentTransactions = [...deposits, ...withdrawals]
        .map(tx => ({
            ...tx,
            userName: userMap.get(tx.userId) || 'Anonymous',
        }))
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 10); // Ensure we don't exceed 10 total transactions

    return {
        users,
        packagePrices,
        recentTransactions,
    };
  }
);
