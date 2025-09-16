
'use server';

/**
 * @fileOverview Secure backend flows for administrative actions.
 * These functions are designed to be called only by authenticated admins
 * from the client-side to perform sensitive operations.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { verifyAdmin } from '@/ai/flows/user-management'; // Import from the central location


// --- Helper to synchronize hasActiveInvestment flag ---
async function syncHasActiveInvestment(db: FirebaseFirestore.Firestore, userId: string) {
    const userRef = db.doc(`users/${userId}`);
    const investmentsColRef = db.collection(`users/${userId}/investments`);
    
    const activeInvestmentsSnapshot = await investmentsColRef.where('status', '==', 'active').limit(1).get();
    const hasActive = !activeInvestmentsSnapshot.empty;
    
    await userRef.set({ hasActiveInvestment: hasActive }, { merge: true });
    console.log(`User ${userId} hasActiveInvestment status set to ${hasActive}.`);
}


// --- Update User Balance ---
export const UpdateBalanceInputSchema = z.object({
  userId: z.string().describe("The UID of the user whose balance is being updated."),
  newBalance: z.number().min(0).describe("The new available balance for the user."),
});
export type UpdateBalanceInput = z.infer<typeof UpdateBalanceInputSchema>;

export async function updateBalance(input: UpdateBalanceInput): Promise<{success: boolean}> {
    return updateBalanceFlow(input);
}

const updateBalanceFlow = ai.defineFlow(
  {
    name: 'updateBalanceFlow',
    inputSchema: UpdateBalanceInputSchema,
    outputSchema: z.object({ success: z.boolean() }),
    auth: { user: true, admin: true }
  },
  async (input, {auth}) => {
    await verifyAdmin({auth}); // Pass auth object
    const db = getFirestore();
    const userStatsRef = db.doc(`userStats/${input.userId}`);
    await userStatsRef.set({
      availableBalance: input.newBalance
    }, { merge: true });

    return { success: true };
  }
);


// --- Update Investment ---
export const UpdateInvestmentInputSchema = z.object({
  userId: z.string(),
  investmentId: z.string(),
  price: z.number().positive(),
  dailyReturn: z.number().positive(),
  status: z.enum(["active", "completed"]),
});
export type UpdateInvestmentInput = z.infer<typeof UpdateInvestmentInputSchema>;

export async function updateInvestment(input: UpdateInvestmentInput): Promise<{success: boolean}> {
    return updateInvestmentFlow(input);
}

const updateInvestmentFlow = ai.defineFlow(
  {
    name: 'updateInvestmentFlow',
    inputSchema: UpdateInvestmentInputSchema,
    outputSchema: z.object({ success: z.boolean() }),
    auth: { user: true, admin: true }
  },
  async (input, {auth}) => {
    await verifyAdmin({auth}); // Pass auth object
    const db = getFirestore();
    
    const investmentRef = db.doc(`users/${input.userId}/investments/${input.investmentId}`);
    
    await investmentRef.update({
      price: input.price,
      dailyReturn: input.dailyReturn,
      status: input.status,
    });
    
    // After updating, synchronize the user's active status.
    await syncHasActiveInvestment(db, input.userId);
    
    return { success: true };
  }
);


// --- Delete Investment ---
export const DeleteInvestmentInputSchema = z.object({
    userId: z.string(),
    investmentId: z.string(),
});
export type DeleteInvestmentInput = z.infer<typeof DeleteInvestmentInputSchema>;

export async function deleteInvestment(input: DeleteInvestmentInput): Promise<{success: boolean}> {
    return deleteInvestmentFlow(input);
}

const deleteInvestmentFlow = ai.defineFlow(
  {
    name: 'deleteInvestmentFlow',
    inputSchema: DeleteInvestmentInputSchema,
    outputSchema: z.object({ success: z.boolean() }),
    auth: { user: true, admin: true }
  },
  async (input, {auth}) => {
    await verifyAdmin({auth}); // Pass auth object
    const db = getFirestore();
    const investmentRef = db.doc(`users/${input.userId}/investments/${input.investmentId}`);
    
    await investmentRef.delete();
    
    // After deleting, synchronize the user's active status.
    await syncHasActiveInvestment(db, input.userId);
    
    return { success: true };
  }
);

// --- Admin Contributor Application Management ---
export const UpdateContributorApplicationInputSchema = z.object({
  applicationId: z.string(),
  status: z.enum(['approved', 'rejected']),
});
export type UpdateContributorApplicationInput = z.infer<typeof UpdateContributorApplicationInputSchema>;

export async function updateContributorApplicationStatus(input: UpdateContributorApplicationInput): Promise<{success: boolean}> {
    return updateContributorApplicationStatusFlow(input);
}

const updateContributorApplicationStatusFlow = ai.defineFlow(
  {
    name: 'updateContributorApplicationStatusFlow',
    inputSchema: UpdateContributorApplicationInputSchema,
    outputSchema: z.object({ success: z.boolean() }),
    auth: { user: true, admin: true },
  },
  async (input, {auth}) => {
    await verifyAdmin({auth}); // Pass auth object
    const db = getFirestore();
    const applicationRef = db.doc(`contributorApplications/${input.applicationId}`);
    
    const applicationDoc = await applicationRef.get();
    if (!applicationDoc.exists) {
      throw new Error('Application not found.');
    }
    
    await db.runTransaction(async (transaction) => {
      // READ must come first in a transaction
      const appData = applicationDoc.data();
      const userId = appData?.userId;
      
      if (input.status === 'rejected' && userId) {
        const depositAmount = appData?.depositAmount;
        if (depositAmount && depositAmount > 0) {
            const userStatsRef = db.doc(`userStats/${userId}`);
            // If rejected, refund the deposit.
            transaction.update(userStatsRef, {
                availableBalance: FieldValue.increment(depositAmount),
            });
        }
      }
      
      // Update the application status in the same transaction
      transaction.update(applicationRef, { status: input.status });
    });
    
    return { success: true };
  }
);

// --- Approve Deposit and Handle Referral ---
export const ApproveDepositInputSchema = z.object({
  proofId: z.string(),
  verifiedAmount: z.number().positive(),
});
export type ApproveDepositInput = z.infer<typeof ApproveDepositInputSchema>;

export async function approveDeposit(input: ApproveDepositInput): Promise<{success: boolean}> {
    return approveDepositFlow(input);
}

const approveDepositFlow = ai.defineFlow(
  {
    name: 'approveDepositFlow',
    inputSchema: ApproveDepositInputSchema,
    outputSchema: z.object({ success: z.boolean() }),
    auth: { user: true, admin: true },
  },
  async ({ proofId, verifiedAmount }, {auth}) => {
    await verifyAdmin({auth}); // Pass auth object
    const db = getFirestore();
    const proofRef = db.doc(`transactionProofs/${proofId}`);
    
    let depositorId = '';

    // --- Step 1: Run transaction to approve deposit and credit user ---
    await db.runTransaction(async (transaction) => {
        const proofDoc = await transaction.get(proofRef);
        if (!proofDoc.exists) throw new Error("Deposit proof not found.");

        const proofData = proofDoc.data();
        if (proofData?.status !== 'pending') {
            throw new Error("This deposit has already been processed.");
        }
        
        depositorId = proofData.userId;
        if (!depositorId) throw new Error("User ID not found on deposit proof.");
        
        const userStatsRef = db.doc(`userStats/${depositorId}`);
        
        // Approve the proof
        transaction.update(proofRef, { status: 'approved', amount: verifiedAmount });
        
        // Credit the user's balance using atomic increments
        transaction.set(userStatsRef, {
            availableBalance: FieldValue.increment(verifiedAmount),
            rechargeAmount: FieldValue.increment(verifiedAmount),
        }, { merge: true });
    });
    
    if (!depositorId) {
        throw new Error("Failed to resolve depositor ID after transaction.");
    }
    
    // --- Step 2: Handle referral commission outside the main transaction ---
    const userDoc = await db.doc(`users/${depositorId}`).get();
    const referrerId = userDoc.data()?.referredBy;
    
    if (referrerId) {
        const commissionAmount = verifiedAmount * 0.05; // 5% commission
        if (commissionAmount > 0) {
            const referrerStatsRef = db.doc(`userStats/${referrerId}`);
            try {
                // Use atomic increment for the referrer's balance as well.
                // This is safe from race conditions.
                await referrerStatsRef.set({
                    availableBalance: FieldValue.increment(commissionAmount),
                }, { merge: true });
                console.log(`Awarded KES ${commissionAmount} commission to referrer ${referrerId} for deposit ${proofId}.`);
            } catch (error) {
                console.error(`Failed to award commission to referrer ${referrerId}. Error: ${error}`);
                // Don't throw error, main operation succeeded. Log for manual correction.
            }
        }
    }

    return { success: true };
  }
);
