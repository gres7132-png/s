'use server';

/**
 * @fileOverview This file contains the AI flow for generating investment package suggestions.
 */

import {ai} from '@/ai/genkit';
import {z} from 'zod';

export const InvestmentSuggestionInputSchema = z.object({
  userProfile: z.string().describe('A summary of the user profile, including investment history, risk tolerance, and financial goals.'),
});

export const InvestmentSuggestionOutputSchema = z.object({
    suggestedPackages: z.array(z.string()).describe("A list of 2-3 investment package names that are suitable for the user based on their profile."),
});

export type InvestmentSuggestionInput = z.infer<typeof InvestmentSuggestionInputSchema>;
export type InvestmentSuggestionOutput = z.infer<typeof InvestmentSuggestionOutputSchema>;

const investmentSuggestionPrompt = ai.definePrompt({
    name: 'investmentSuggestionPrompt',
    input: { schema: InvestmentSuggestionInputSchema },
    output: { schema: InvestmentSuggestionOutputSchema },
    prompt: `You are a financial advisor for a high-yield investment platform. Based on the user's profile below, recommend 2-3 specific investment packages from the platform that would be a good fit.

User Profile:
---
{{{userProfile}}}
---

Focus on providing only the names of the packages in the 'suggestedPackages' array.`,
});

export async function suggestInvestmentPackages(input: InvestmentSuggestionInput): Promise<InvestmentSuggestionOutput> {
    const { output } = await investmentSuggestionPrompt(input);
    return output!;
}
