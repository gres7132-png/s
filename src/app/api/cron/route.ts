
import { calculateAllUserEarnings } from '@/ai/flows/calculate-daily-earnings';
import { NextResponse } from 'next/server';

/**
 * This is a secure endpoint designed to be called by a scheduler (e.g., Vercel Cron Jobs).
 * It triggers the backend flow to calculate daily earnings for all users.
 * To secure this endpoint, you should use a secret key passed in the Authorization header.
 * 
 * Example: `curl -H "Authorization: Bearer YOUR_SECRET_KEY" https://your-app-url/api/cron`
 */

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', {
      status: 401,
    });
  }

  try {
    const result = await calculateAllUserEarnings();
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Cron job failed:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
