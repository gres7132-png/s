
'use server';

/**
 * @fileOverview Secure backend flows for administrative actions.
 * These functions are designed to be called only by authenticated admins
 * from the client-side to perform sensitive operations.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { getFirestore } from 'firebase-admin/firestore';
import { getApps, initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { verifyAdmin } from '@/ai/flows/user-management'; // Import from the central location


// --- Helper to synchronize hasActiveInvestment flag ---
async function syncHasActiveInvestment(db: FirebaseFirestore.Firestore, userId: string) {
    const userRef = db.doc(`users/${userId}`);
    const investmentsColRef = db.collection(`users/${userId}/investments`);
    
    const activeInvestmentsSnapshot = await investmentsColRef.where('status', '==', 'active').limit(1).get();
    const hasActive = !activeInvestmentsSnapshot.empty;
    
    await userRef.update({ hasActiveInvestment: hasActive });
    console.log(`User ${userId} hasActiveInvestment status set to ${hasActive}.`);
}


// --- Update User Balance ---
export const UpdateBalanceInputSchema = z.object({
  userId: z.string().describe("The UID of the user whose balance is being updated."),
  newBalance: z.number().min(0).describe("The new available balance for the user."),
});
type UpdateBalanceInput = z.infer<typeof UpdateBalanceInputSchema>;

export const updateBalance = ai.defineFlow(
  {
    name: 'updateBalanceFlow',
    inputSchema: UpdateBalanceInputSchema,
    outputSchema: z.object({ success: z.boolean() }),
    auth: {
        user: true // Require user authentication
    }
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

export const updateInvestment = ai.defineFlow(
  {
    name: 'updateInvestmentFlow',
    inputSchema: UpdateInvestmentInputSchema,
    outputSchema: z.object({ success: z.boolean() }),
    auth: { user: true }
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

export const deleteInvestment = ai.defineFlow(
  {
    name: 'deleteInvestmentFlow',
    inputSchema: DeleteInvestmentInputSchema,
    outputSchema: z.object({ success: z.boolean() }),
    auth: { user: true }
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

export const updateContributorApplicationStatus = ai.defineFlow(
  {
    name: 'updateContributorApplicationStatusFlow',
    inputSchema: UpdateContributorApplicationInputSchema,
    outputSchema: z.object({ success: z.boolean() }),
    auth: { user: true },
  },
  async (input, flow) => {
    await verifyAdmin(flow);
    const db = getFirestore();
    const applicationRef = db.doc(`contributorApplications/${input.applicationId}`);
    
    const applicationDoc = await applicationRef.get();
    if (!applicationDoc.exists) {
      throw new Error('Application not found.');
    }
    
    if (input.status === 'rejected') {
      // If rejected, refund the deposit to the user's available balance.
      const appData = applicationDoc.data();
      const userId = appData?.userId;
      const depositAmount = appData?.depositAmount;
      if (userId && depositAmount) {
        const userStatsRef = db.doc(`userStats/${userId}`);
        await userStatsRef.update({
          availableBalance: FieldValue.increment(depositAmount),
        });
      }
    }
    
    await applicationRef.update({ status: input.status });
    return { success: true };
  }
);
