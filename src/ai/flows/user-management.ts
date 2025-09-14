
'use server';

/**
 * @fileOverview User management flows for administrators.
 * This file is the central point for Firebase Admin SDK initialization.
 * All administrative flows are secured here.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore';

// Centralized Firebase Admin SDK Initialization
if (!getApps().length) {
  if (!process.env.FIREBASE_ADMIN_SDK_CONFIG) {
    console.error("CRITICAL: FIREBASE_ADMIN_SDK_CONFIG environment variable is not set.");
  } else {
    try {
      initializeApp({
        credential: cert(JSON.parse(process.env.FIREBASE_ADMIN_SDK_CONFIG))
      });
      console.log("Firebase Admin SDK initialized successfully.");
    } catch (e: any) {
      console.error("CRITICAL: Admin SDK initialization failed:", e.message);
    }
  }
}

// --- Central Admin Verification Helper ---
export async function verifyAdmin(flow: any) {
    if (!getApps().length) {
        throw new Error("Admin SDK is not configured. Check server environment variables.");
    }
    if (!flow.auth) {
        throw new Error("Authentication is required.");
    }
    const auth = getAuth();
    const user = await auth.getUser(flow.auth.uid);
    // This list MUST be kept in sync with the one in `src/hooks/use-auth.tsx`
    const ADMIN_EMAILS = ["gres7132@gmail.com"]; 
    if (!user.email || !ADMIN_EMAILS.includes(user.email)) {
        throw new Error("You do not have permission to perform this action.");
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

const ContributorApplicationInputSchema = z.object({
  tierId: z.string().describe("The ID of the contributor tier being applied for."),
  tierLevel: z.string().describe("The level name of the tier (e.g., V1)."),
  depositAmount: z.number().positive().describe("The deposit amount required for the tier."),
});
type ContributorApplicationInput = z.infer<typeof ContributorApplicationInputSchema>;


/**
 * SECURED: Lists all users. Only callable by an admin.
 * @returns {Promise<ListUsersOutput>} A list of user data.
 */
export const listAllUsers = ai.defineFlow(
  {
    name: 'listAllUsersFlow',
    outputSchema: ListUsersOutputSchema,
    auth: { user: true, admin: true }
  },
  async (_, flow) => {
    await verifyAdmin(flow);
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
);


/**
 * SECURED: Updates the disabled status of a user. Only callable by an admin.
 * @param {UpdateUserStatusInput} input The user's UID and new status.
 * @returns {Promise<{success: boolean}>} A success flag.
 */
export const updateUserStatus = ai.defineFlow(
    {
        name: 'updateUserStatusFlow',
        inputSchema: UpdateUserStatusInputSchema,
        outputSchema: z.object({ success: z.boolean() }),
        auth: { user: true }
    },
    async (input, flow) => {
        await verifyAdmin(flow);
        const auth = getAuth();
        await auth.updateUser(input.uid, { disabled: input.disabled });
        return { success: true };
    }
);

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


/**
 * Processes an application for a contributor tier.
 * Deducts the deposit from the user's balance and creates an application record.
 */
export const applyForContributorTier = ai.defineFlow(
  {
    name: 'applyForContributorTierFlow',
    inputSchema: ContributorApplicationInputSchema,
    outputSchema: z.object({ success: z.boolean(), applicationId: z.string() }),
    auth: { user: true }
  },
  async ({ tierId, tierLevel, depositAmount }, { auth }) => {
    if (!auth) throw new Error("Authentication required.");
    const userId = auth.uid;
    const db = getFirestore();
    const userStatsRef = db.doc(`userStats/${userId}`);
    const applicationsColRef = db.collection("contributorApplications");

    let applicationId = '';

    await db.runTransaction(async (transaction) => {
      const userStatsDoc = await transaction.get(userStatsRef);
      if (!userStatsDoc.exists() || (userStatsDoc.data()?.availableBalance || 0) < depositAmount) {
        throw new Error("Insufficient funds. Please deposit more funds to apply for this tier.");
      }

      // 1. Deduct the deposit amount from the user's balance
      transaction.update(userStatsRef, {
        availableBalance: FieldValue.increment(-depositAmount),
      });

      // 2. Create the application document for admin review
      const newApplicationRef = applicationsColRef.doc();
      transaction.set(newApplicationRef, {
        userId: userId,
        tierId: tierId,
        tierLevel: tierLevel,
        depositAmount: depositAmount,
        appliedAt: Timestamp.now(),
        status: 'pending', // Admins will review and change this to 'approved' or 'rejected'
      });
      applicationId = newApplicationRef.id;
    });

    return { success: true, applicationId };
  }
);
