
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

// Initialize Firebase Admin SDK if not already initialized
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

// --- Helper to verify admin status ---
async function verifyAdmin(flow: any) {
    if (!getApps().length) {
        throw new Error("Admin SDK is not configured. Check server environment variables.");
    }
    if (!flow.auth) {
        throw new Error("Authentication is required.");
    }
    const auth = getAuth();
    const user = await auth.getUser(flow.auth.uid);
    const ADMIN_EMAILS = ["gres7132@gmail.com"]; // Keep this in sync with use-auth.tsx
    if (!user.email || !ADMIN_EMAILS.includes(user.email)) {
        throw new Error("You do not have permission to perform this action.");
    }
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
    return { success: true };
  }
);
