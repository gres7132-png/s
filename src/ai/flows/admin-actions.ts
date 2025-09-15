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
type UpdateBalanceInput = z.infer<typeof UpdateBalanceInputSchema>;

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
  async (input, flow) => {
    await verifyAdmin(flow);
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
type UpdateInvestmentInput = z.infer<typeof UpdateInvestmentInputSchema>;

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
  async (input, flow) => {
    await verifyAdmin(flow);
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
type DeleteInvestmentInput = z.infer<typeof DeleteInvestmentInputSchema>;

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
  async (input, flow) => {
    await verifyAdmin(flow);
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
  async (input, flow) => {
    await verifyAdmin(flow);
    const db = getFirestore();
    const applicationRef = db.doc(`contributorApplications/${input.applicationId}`);
    
    const applicationDoc = await applicationRef.get();
    if (!applicationDoc.exists) {
      throw new Error('Application not found.');
    }
    
    await db.runTransaction(async (transaction) => {
      if (input.status === 'rejected') {
        // If rejected, refund the deposit to the user's available balance.
        const appData = applicationDoc.data();
        const userId = appData?.userId;
        const depositAmount = appData?.depositAmount;

        if (userId && depositAmount > 0) {
          const userStatsRef = db.doc(`userStats/${userId}`);
          // We must read the doc first in a transaction before writing.
          const userStatsDoc = await transaction.get(userStatsRef); 
          if(userStatsDoc.exists()) {
             transaction.update(userStatsRef, {
                availableBalance: FieldValue.increment(depositAmount),
             });
          } else {
             // This case is unlikely but handled for safety.
             transaction.set(userStatsRef, {
                availableBalance: depositAmount,
             });
          }
        }
      }
      // Update the application status in the same transaction
      transaction.update(applicationRef, { status: input.status });
    });
    
    return { success: true };
  }
);