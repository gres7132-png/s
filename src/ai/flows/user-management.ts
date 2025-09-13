
'use server';

/**
 * @fileOverview User management flows for administrators.
 * IMPORTANT: This file now contains the production-ready implementation for user management.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore';

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

// Schema for a single user's data returned by the list flow
export const UserDataSchema = z.object({
  uid: z.string(),
  email: z.string().optional(),
  displayName: z.string().optional(),
  disabled: z.boolean(),
});
export type UserData = z.infer<typeof UserDataSchema>;

// Output schema for the user list flow
export const ListUsersOutputSchema = z.object({
  users: z.array(UserDataSchema),
});
export type ListUsersOutput = z.infer<typeof ListUsersOutputSchema>;

// Input schema for updating a user's status
export const UpdateUserStatusInputSchema = z.object({
  uid: z.string().describe("The UID of the user to update."),
  disabled: z.boolean().describe("The new disabled status for the user."),
});
export type UpdateUserStatusInput = z.infer<typeof UpdateUserStatusInputSchema>;

export const ProcessReferralInputSchema = z.object({
  investorId: z.string().describe("The UID of the user making the investment."),
  investmentAmount: z.number().positive().describe("The amount of the investment."),
});
export type ProcessReferralInput = z.infer<typeof ProcessReferralInputSchema>;

const WithdrawalRequestInputSchema = z.object({
  amount: z.number().min(1000, "Minimum withdrawal is KES 1,000."),
  paymentDetails: z.any().describe("The user's saved payment details object."),
});
type WithdrawalRequestInput = z.infer<typeof WithdrawalRequestInputSchema>;

/**
 * Lists all users. This implementation uses the Firebase Admin SDK.
 * @returns {Promise<ListUsersOutput>} A list of user data.
 */
export async function listAllUsers(): Promise<ListUsersOutput> {
  if (!getApps().length) {
    throw new Error("Admin SDK is not configured. Please check server environment variables.");
  }
  const auth = getAuth();
  const userRecords = await auth.listUsers();
  const users = userRecords.users.map(user => ({
    uid: user.uid,
    email: user.email,
    displayName: user.displayName,
    disabled: user.disabled,
  }));
  return { users };
}


/**
 * Updates the disabled status of a user using the Firebase Admin SDK.
 * @param {UpdateUserStatusInput} input The user's UID and new status.
 * @returns {Promise<{success: boolean}>} A success flag.
 */
export async function updateUserStatus(input: UpdateUserStatusInput): Promise<{success: boolean}> {
    if (!getApps().length) {
      throw new Error("Admin SDK is not configured. Please check server environment variables.");
    }
    const auth = getAuth();
    await auth.updateUser(input.uid, { disabled: input.disabled });
    return { success: true };
}

/**
 * Processes a referral commission when a new investment is made.
 * @param {ProcessReferralInput} input The investor's UID and investment amount.
 * @returns {Promise<{success: boolean, commissionAwarded: number}>} A success flag and the commission amount.
 */
export const processReferral = ai.defineFlow(
  {
    name: 'processReferralFlow',
    inputSchema: ProcessReferralInputSchema,
    outputSchema: z.object({ success: z.boolean(), commissionAwarded: z.number() }),
  },
  async ({ investorId, investmentAmount }) => {
    if (!getApps().length) {
      throw new Error("Admin SDK is not configured. Please check server environment variables.");
    }
    const db = getFirestore();
    const investorDocRef = db.doc(`users/${investorId}`);
    
    const investorDoc = await investorDocRef.get();
    if (!investorDoc.exists) {
      console.log(`Investor ${investorId} not found. No referral to process.`);
      return { success: true, commissionAwarded: 0 };
    }
    
    const referrerId = investorDoc.data()?.referredBy;
    if (!referrerId) {
      console.log(`Investor ${investorId} was not referred by anyone.`);
      return { success: true, commissionAwarded: 0 };
    }
    
    const commissionRate = 0.05; // 5%
    const commissionAmount = investmentAmount * commissionRate;
    
    const referrerStatsRef = db.doc(`userStats/${referrerId}`);
    
    try {
      await referrerStatsRef.set({
        availableBalance: FieldValue.increment(commissionAmount)
      }, { merge: true });
      console.log(`Awarded ${commissionAmount} commission to referrer ${referrerId}.`);
      return { success: true, commissionAwarded: commissionAmount };
    } catch (error) {
       console.error(`Failed to award commission to ${referrerId}:`, error);
       // This will now handle creating the doc if it doesn't exist and other errors.
       throw new Error("Failed to award commission.");
    }
  }
);

/**
 * Creates a withdrawal request after verifying the user's balance on the server.
 */
export const requestWithdrawal = ai.defineFlow(
  {
    name: 'requestWithdrawalFlow',
    inputSchema: WithdrawalRequestInputSchema,
    outputSchema: z.object({ success: z.boolean(), requestId: z.string() }),
    auth: { user: true }
  },
  async ({ amount, paymentDetails }, { auth }) => {
    if (!auth) throw new Error("Authentication required.");
    const userId = auth.uid;

    const db = getFirestore();
    const userStatsRef = db.doc(`userStats/${userId}`);
    const requestsColRef = db.collection("withdrawalRequests");
    
    let requestId = '';
    
    await db.runTransaction(async (transaction) => {
      const userStatsDoc = await transaction.get(userStatsRef);
      if (!userStatsDoc.exists()) {
        throw new Error("User stats not found. Cannot process withdrawal.");
      }
      
      const currentBalance = userStatsDoc.data()?.availableBalance || 0;
      if (currentBalance < amount) {
        throw new Error(`Insufficient funds. Your balance is KES ${currentBalance}, but you requested KES ${amount}.`);
      }

      // Important: We do NOT deduct the balance here. Balance is only deducted upon admin approval.
      // We just create the request.
      const newRequestRef = requestsColRef.doc();
      transaction.set(newRequestRef, {
        userId: userId,
        amount: amount,
        paymentDetails: paymentDetails,
        requestedAt: Timestamp.now(),
        status: 'pending',
      });
      requestId = newRequestRef.id;
    });

    return { success: true, requestId };
  }
);


// Define the Genkit flows
ai.defineFlow({
    name: 'listAllUsersFlow',
    outputSchema: ListUsersOutputSchema,
}, listAllUsers);

ai.defineFlow({
    name: 'updateUserStatusFlow',
    inputSchema: UpdateUserStatusInputSchema,
    outputSchema: z.object({ success: z.boolean() }),
}, updateUserStatus);
