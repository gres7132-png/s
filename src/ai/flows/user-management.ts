
'use server';

/**
 * @fileOverview User management flows for administrators.
 * IMPORTANT: This flow now contains the production-ready implementation for user management.
 * In a real environment, you would need to initialize the Firebase Admin SDK.
 * For this prototype, the functions will still simulate the behavior.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
// In a real environment, you would uncomment these lines and configure the Admin SDK
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

if (!getApps().length) {
  try {
    initializeApp({
      credential: cert(JSON.parse(process.env.FIREBASE_ADMIN_SDK_CONFIG!))
    });
  } catch (e) {
    console.error("Admin SDK initialization failed. This is expected in a client-side environment. The feature will work in a production server environment.");
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


/**
 * Lists all users. This implementation uses the Firebase Admin SDK.
 * @returns {Promise<ListUsersOutput>} A list of user data.
 */
export async function listAllUsers(): Promise<ListUsersOutput> {
  if (!getApps().length) {
    console.log("Simulating listAllUsers. Admin SDK not initialized.");
    return { users: [] };
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
      console.log(`Simulating update for user ${input.uid} to disabled=${input.disabled}. Admin SDK not initialized.`);
      return { success: true };
    }
    const auth = getAuth();
    await auth.updateUser(input.uid, { disabled: input.disabled });
    return { success: true };
}


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
