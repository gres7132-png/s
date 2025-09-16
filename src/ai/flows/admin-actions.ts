
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
import { TAX_FREE_DAY } from '@/lib/config';


// --- Helper to synchronize hasActiveInvestment flag atomically ---
async function syncHasActiveInvestment(db: FirebaseFirestore.Firestore, userId: string) {
    const userRef = db.doc(`users/${userId}`);
    const investmentsColRef = db.collection(`users/${userId}/investments`);
    
    // This is safe to run as a separate transaction as it's idempotent.
    // It recalculates the truth from the current state of investments.
    return db.runTransaction(async (transaction) => {
        const activeInvestmentsSnapshot = await transaction.get(
            investmentsColRef.where('status', '==', 'active').limit(1)
        );
        const hasActive = !activeInvestmentsSnapshot.empty;
        
        transaction.set(userRef, { hasActiveInvestment: hasActive }, { merge: true });
        console.log(`User ${userId} hasActiveInvestment status atomically set to ${hasActive}.`);
    });
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
    
    // After updating, atomically synchronize the user's active status.
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
    
    // After deleting, atomically synchronize the user's active status.
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
    
    await db.runTransaction(async (transaction) => {
      const applicationDoc = await transaction.get(applicationRef);
      if (!applicationDoc.exists) {
        throw new Error('Application not found.');
      }
      
      const appData = applicationDoc.data();
      if (!appData) {
        throw new Error('Application data is missing.');
      }

      if (appData.status !== 'pending') {
          throw new Error('This application has already been processed.');
      }

      const userId = appData.userId;
      
      // If the application is rejected, atomically refund the deposit.
      if (input.status === 'rejected' && userId) {
        const depositAmount = appData.depositAmount;
        if (depositAmount && depositAmount > 0) {
            const userStatsRef = db.doc(`userStats/${userId}`);
            // This is a secure atomic increment, safe from race conditions.
            transaction.set(userStatsRef, {
                availableBalance: FieldValue.increment(depositAmount),
            }, { merge: true });
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
    let depositorReferredBy: string | null = null;

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

        const userDoc = await transaction.get(db.doc(`users/${depositorId}`));
        depositorReferredBy = userDoc.data()?.referredBy || null;
        
        const userStatsRef = db.doc(`userStats/${depositorId}`);
        
        // Approve the proof
        transaction.update(proofRef, { status: 'approved', amount: verifiedAmount });
        
        // Credit the user's balance using atomic increments for production-ready safety
        transaction.set(userStatsRef, {
            availableBalance: FieldValue.increment(verifiedAmount),
            rechargeAmount: FieldValue.increment(verifiedAmount),
        }, { merge: true });
    });
    
    if (!depositorId) {
        throw new Error("Failed to resolve depositor ID after transaction.");
    }
    
    // --- Step 2: Handle referral commission outside the main transaction ---
    // This is safe to do outside the transaction because we're using atomic increments.
    if (depositorReferredBy) {
        const commissionAmount = verifiedAmount * 0.05; // 5% commission
        if (commissionAmount > 0) {
            const referrerStatsRef = db.doc(`userStats/${depositorReferredBy}`);
            try {
                // Use a secure atomic increment for the referrer's balance. This is production-ready.
                await referrerStatsRef.set({
                    availableBalance: FieldValue.increment(commissionAmount),
                }, { merge: true });
                console.log(`Awarded KES ${commissionAmount} commission to referrer ${depositorReferredBy} for deposit ${proofId}.`);
            } catch (error) {
                console.error(`Failed to award commission to referrer ${depositorReferredBy}. Error: ${error}`);
                // Don't throw error, main operation succeeded. Log for manual correction.
            }
        }
    }

    return { success: true };
  }
);


// --- Approve Withdrawal ---
export const ApproveWithdrawalInputSchema = z.object({
  withdrawalId: z.string(),
});
export type ApproveWithdrawalInput = z.infer<typeof ApproveWithdrawalInputSchema>;

export async function approveWithdrawal(input: ApproveWithdrawalInput): Promise<{success: boolean; message: string}> {
    return approveWithdrawalFlow(input);
}

const approveWithdrawalFlow = ai.defineFlow(
  {
    name: 'approveWithdrawalFlow',
    inputSchema: ApproveWithdrawalInputSchema,
    outputSchema: z.object({ success: z.boolean(), message: z.string() }),
    auth: { user: true, admin: true },
  },
  async ({ withdrawalId }, { auth }) => {
    await verifyAdmin({auth});
    const db = getFirestore();
    const withdrawalRef = db.doc(`withdrawalRequests/${withdrawalId}`);
    
    const WITHDRAWAL_FEE_RATE = 0.15;
    const isTaxFreeDay = new Date().getDate() === TAX_FREE_DAY;
    let finalMessage = '';

    await db.runTransaction(async (transaction) => {
      const withdrawalDoc = await transaction.get(withdrawalRef);
      if (!withdrawalDoc.exists || withdrawalDoc.data()?.status !== 'pending') {
        throw new Error("Withdrawal request not found or already processed.");
      }
      
      const { userId, amount: requestedAmount } = withdrawalDoc.data()!;
      const userStatsRef = db.doc(`userStats/${userId}`);
      const userStatsDoc = await transaction.get(userStatsRef);
      const currentBalance = userStatsDoc.exists() ? userStatsDoc.data()?.availableBalance || 0 : 0;

      if (currentBalance < requestedAmount) {
        throw new Error("User has insufficient funds for this withdrawal.");
      }

      const serviceFee = isTaxFreeDay ? 0 : requestedAmount * WITHDRAWAL_FEE_RATE;
      
      transaction.update(userStatsRef, {
        availableBalance: FieldValue.increment(-requestedAmount),
        withdrawalAmount: FieldValue.increment(requestedAmount),
      });

      transaction.update(withdrawalRef, {
        status: 'approved',
        serviceFee: serviceFee,
      });

      finalMessage = `Withdrawal has been approved. ${isTaxFreeDay ? 'No service fee was charged.' : ''}`;
    });

    return { success: true, message: finalMessage };
  }
);

// --- Reject Withdrawal ---
export const RejectWithdrawalInputSchema = z.object({
  withdrawalId: z.string(),
});
export type RejectWithdrawalInput = z.infer<typeof RejectWithdrawalInputSchema>;

export async function rejectWithdrawal(input: RejectWithdrawalInput): Promise<{success: boolean}> {
    return rejectWithdrawalFlow(input);
}

const rejectWithdrawalFlow = ai.defineFlow(
  {
    name: 'rejectWithdrawalFlow',
    inputSchema: RejectWithdrawalInputSchema,
    outputSchema: z.object({ success: z.boolean() }),
    auth: { user: true, admin: true },
  },
  async ({ withdrawalId }, { auth }) => {
    await verifyAdmin({ auth });
    const db = getFirestore();
    const withdrawalRef = db.doc(`withdrawalRequests/${withdrawalId}`);

    const withdrawalDoc = await withdrawalRef.get();
    if (!withdrawalDoc.exists || withdrawalDoc.data()?.status !== 'pending') {
        throw new Error("Withdrawal request not found or already processed.");
    }
    
    await withdrawalRef.update({ status: 'rejected' });
    return { success: true };
  }
);
