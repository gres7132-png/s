
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
import { sendAdminNotification } from '@/ai/utils/email';

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
    // This list MUST be kept in sync with the one in your firestore.rules
    const ADMIN_EMAILS = ["gres7132@gmail.com"]; 
    if (!user.email || !ADMIN_EMAILS.includes(user.email)) {
        throw new Error("You do not have permission to perform this action.");
    }
}

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

const DepositProofInputSchema = z.object({
  amount: z.number().positive("Amount must be a positive number."),
  transactionProof: z.string().min(10, "Please enter a valid transaction ID or hash."),
});
type DepositProofInput = z.infer<typeof DepositProofInputSchema>;


const ContributorApplicationInputSchema = z.object({
  tierId: z.string().describe("The ID of the contributor tier being applied for."),
  tierLevel: z.string().describe("The level name of the tier (e.g., V1)."),
  depositAmount: z.number().positive().describe("The deposit amount required for the tier."),
});
type ContributorApplicationInput = z.infer<typeof ContributorApplicationInputSchema>;

/**
 * Wrapper for updateUserStatusFlow.
 */
export async function updateUserStatus(input: UpdateUserStatusInput): Promise<{success: boolean}> {
    return updateUserStatusFlow(input);
}


/**
 * SECURED: Updates the disabled status of a user. Only callable by an admin.
 * @param {UpdateUserStatusInput} input The user's UID and new status.
 * @returns {Promise<{success: boolean}>} A success flag.
 */
const updateUserStatusFlow = ai.defineFlow(
    {
        name: 'updateUserStatusFlow',
        inputSchema: UpdateUserStatusInputSchema,
        outputSchema: z.object({ success: z.boolean() }),
        auth: { user: true, admin: true }
    },
    async (input, flow) => {
        await verifyAdmin(flow);
        const auth = getAuth();
        await auth.updateUser(input.uid, { disabled: input.disabled });
        return { success: true };
    }
);

/**
 * Wrapper for processReferralFlow.
 */
export async function processReferral(input: ProcessReferralInput): Promise<{success: boolean, commissionAwarded: number}> {
    return processReferralFlow(input);
}

/**
 * Processes a referral commission when a new investment is made.
 * @param {ProcessReferralInput} input The investor's UID and investment amount.
 * @returns {Promise<{success: boolean, commissionAwarded: number}>} A success flag and the commission amount.
 */
const processReferralFlow = ai.defineFlow(
  {
    name: 'processReferralFlow',
    inputSchema: ProcessReferralInputSchema,
    outputSchema: z.object({ success: z.boolean(), commissionAwarded: z.number() }),
    auth: { admin: true } // This flow needs admin to write to another user's stats
  },
  async ({ investorId, investmentAmount }) => {
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
 * Wrapper for requestWithdrawalFlow
 */
export async function requestWithdrawal(input: WithdrawalRequestInput): Promise<{ success: boolean, requestId: string }> {
  return requestWithdrawalFlow(input);
}

/**
 * Creates a withdrawal request after verifying the user's balance on the server.
 */
const requestWithdrawalFlow = ai.defineFlow(
  {
    name: 'requestWithdrawalFlow',
    inputSchema: WithdrawalRequestInputSchema,
    outputSchema: z.object({ success: z.boolean(), requestId: z.string() }),
    auth: { user: true, admin: true }
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

    // After successfully creating the request, send an email notification.
    await sendAdminNotification({
      subject: 'New Withdrawal Request',
      text: `A new withdrawal request for KES ${amount} from user ${userId} is pending your approval.`,
      html: `<p>A new withdrawal request for <strong>KES ${amount}</strong> from user ${userId} is pending your approval.</p><p>Please log in to the admin panel to review it.</p>`,
    });

    return { success: true, requestId };
  }
);

/**
 * Wrapper for submitDepositProofFlow
 */
export async function submitDepositProof(input: DepositProofInput): Promise<{ success: boolean, proofId: string }> {
  return submitDepositProofFlow(input);
}

/**
 * Creates a deposit proof and sends an admin notification.
 */
const submitDepositProofFlow = ai.defineFlow(
  {
    name: 'submitDepositProofFlow',
    inputSchema: DepositProofInputSchema,
    outputSchema: z.object({ success: z.boolean(), proofId: z.string() }),
    auth: { user: true, admin: true }
  },
  async ({ amount, transactionProof }, { auth }) => {
    if (!auth) throw new Error("Authentication required.");
    const userId = auth.uid;
    const db = getFirestore();
    const proofsColRef = db.collection("transactionProofs");

    const newProof = await proofsColRef.add({
        userId: userId,
        amount: amount,
        proof: transactionProof,
        submittedAt: Timestamp.now(),
        status: 'pending',
    });

    // After successfully creating the proof, send an email notification.
    await sendAdminNotification({
      subject: 'New Deposit Proof Submitted',
      text: `A new deposit proof for KES ${amount} from user ${userId} is pending your verification.`,
      html: `<p>A new deposit proof for <strong>KES ${amount}</strong> from user ${userId} is pending your verification.</p><p>Proof/ID: ${transactionProof}</p><p>Please log in to the admin panel to review it.</p>`,
    });

    return { success: true, proofId: newProof.id };
  }
);


/**
 * Wrapper for applyForContributorTierFlow
 */
export async function applyForContributorTier(input: ContributorApplicationInput): Promise<{ success: boolean, applicationId: string }> {
  return applyForContributorTierFlow(input);
}

/**
 * Processes an application for a contributor tier.
 */
const applyForContributorTierFlow = ai.defineFlow(
  {
    name: 'applyForContributorTierFlow',
    inputSchema: ContributorApplicationInputSchema,
    outputSchema: z.object({ success: z.boolean(), applicationId: z.string() }),
    auth: { user: true, admin: true }
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
