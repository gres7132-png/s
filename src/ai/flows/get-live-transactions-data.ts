
'use server';

/**
 * @fileOverview A secure backend flow for fetching data needed for the live transactions feed.
 * This flow queries for a sample of real users and package prices to make the feed more realistic.
 */

import '@/ai/flows/user-management'; // Ensures Admin SDK is initialized
import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { getFirestore } from 'firebase-admin/firestore';
import { getApps } from 'firebase-admin/app';

const UserSchema = z.object({
  displayName: z.string(),
});

const LiveTransactionsDataSchema = z.object({
    users: z.array(UserSchema),
    packagePrices: z.array(z.number()),
});
export type LiveTransactionsData = z.infer<typeof LiveTransactionsDataSchema>;

/**
 * A secure flow to get data for the live transactions component.
 * It fetches a sample of real user display names and investment package prices.
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

    // Fetch a sample of real users (e.g., limit to 20 for performance)
    const usersQuery = db.collection('users').limit(20);
    const usersSnapshot = await usersQuery.get();
    const users = usersSnapshot.docs.map(doc => ({ displayName: doc.data().displayName || 'Anonymous' }));

    // Fetch all package prices
    const packagesQuery = db.collection('silverLevelPackages');
    const packagesSnapshot = await packagesQuery.get();
    const packagePrices = packagesSnapshot.docs.map(doc => doc.data().price || 0);

    return {
        users,
        packagePrices,
    };
  }
);
