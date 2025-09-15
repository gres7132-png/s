
'use server';

/**
 * @fileOverview A virtual assistant flow for the YieldLink platform.
 * This file defines the AI logic for a chatbot that can answer user questions
 * based on a predefined knowledge base about the platform's features.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

export const AssistantInputSchema = z.string();
export type AssistantInput = z.infer<typeof AssistantInputSchema>;
export type AssistantOutput = string;

const assistantPrompt = `
You are a friendly and helpful virtual assistant for YieldLink, a high-yield investment platform. Your goal is to answer user questions accurately based on the information provided below. Be concise and clear in your answers.

If a user asks about something not covered in the information, or if they need help with a specific account issue, politely tell them you cannot help with that and direct them to contact customer support via the official WhatsApp channel.

**YieldLink Platform Information:**

*   **What is YieldLink?**
    YieldLink is an investment company that operates a large fleet of cryptocurrency mining rigs. We use investor capital to cover operational costs like electricity and maintenance. In return, investors receive a consistent daily income from the mining profits.

*   **How do I earn money?**
    You earn money in three main ways:
    1.  **Daily Investment Returns:** Purchase a Silver Level investment package. Each package has a specific price, daily return amount, and duration. Your daily earnings are added to your account automatically.
    2.  **Referral Commissions:** When you refer someone and they make their first investment, you earn a one-time 5% commission on their investment amount.
    3.  **Agent & Contributor Programs:** You can earn a fixed monthly income by qualifying for our Agent or Golden Level Contributor programs, which are based on having active referrals.

*   **Investment Packages (Product Center):**
    Users can invest by purchasing a "Silver Level" package. These packages have a price, a daily return, and a duration in days. The earnings are automatically calculated and added to the user's balance.

*   **Referral Program:**
    Users get a unique referral link. If a new user signs up using that link and invests, the referrer earns a 5% commission on the invested amount. This is a one-time bonus per referred user's investment.

*   **Golden Level Contributor Program:**
    This is for dedicated networkers. To qualify, you must first have at least two active referrals. You can then apply for different tiers (e.g., V1, V2) by paying a security deposit. Each tier offers a stable, fixed monthly income. Higher tiers require a larger deposit but offer a larger salary. Applications are subject to admin approval.

*   **Agent Commission Program:**
    This program rewards users with a recurring monthly commission based on the number of active investors they have referred. An "active investor" is a referral who has at least one running investment package. The more active referrals you have, the higher your monthly commission.

*   **Withdrawals & Deposits:**
    -   **Deposits:** To deposit, users must make a payment to the company's provided Mobile Money, Minipay, or Crypto addresses. After payment, they must submit a deposit proof (amount and transaction ID) in the "Wallet" section for verification.
    -   **Withdrawals:** Users can request a withdrawal from their available balance. The minimum withdrawal is KES 1,000.
    -   **Fees:** A 15% service fee is applied to all withdrawals to cover operational costs.
    -   **Tax-Free Day:** The withdrawal service fee is WAIVED on the 23rd of every month.

*   **Account Rules & Security:**
    -   Users are only allowed to have ONE account. The system automatically blocks members with multiple accounts.
    -   Email verification is required to secure an account.

*   **Customer Support:**
    For any issues, including challenges with the app or specific account problems, users should contact the support team via the official WhatsApp channel: https://chat.whatsapp.com/CUTtFWsav7M4OQyJEgUHlJ
`;

export const assistantFlow = ai.defineFlow(
  {
    name: 'assistantFlow',
    inputSchema: AssistantInputSchema,
    outputSchema: z.string(),
  },
  async (query) => {
    const { stream, response } = ai.generateStream({
      model: 'googleai/gemini-1.5-flash-preview',
      prompt: [
        { role: 'system', content: assistantPrompt },
        { role: 'user', content: query },
      ],
      config: { temperature: 0.3 },
    });

    let assistantResponse = '';
    for await (const chunk of stream) {
        assistantResponse += chunk.text;
    }

    return assistantResponse;
  }
);

// This function will be used by the client to stream the response
export async function askAssistant(query: string) {
    const { stream } = ai.generateStream({
        model: 'googleai/gemini-1.5-flash-preview',
        prompt: [
            { role: 'system', content: assistantPrompt },
            { role: 'user', content: query },
        ],
        config: { temperature: 0.3 },
    });

    // Transform the Genkit stream into a simple text stream
    const textStream = new ReadableStream({
        async start(controller) {
            for await (const chunk of stream) {
                controller.enqueue(chunk.text);
            }
            controller.close();
        }
    });

    return textStream;
}
