
/**
 * @file This file contains the core business logic and configuration data 
 * for the application, such as investment packages, distributor levels, and commission tiers.
 * In a production environment, this data would be fetched from a secure backend API
 * connected to an admin control panel.
 */

// All monetary values are in KES.

// --- Payment Details ---
// These details are now securely stored as environment variables and fetched on the server side.
// See src/app/(app)/dashboard/wallet/page.tsx to see how they are used.
export const paymentDetails = {
    mobileMoney: process.env.PAYMENT_MOBILE_MONEY,
    minipay: {
        link: process.env.PAYMENT_MINIPAY_LINK,
        number: process.env.PAYMENT_MINIPAY_NUMBER,
    },
    crypto: {
        BTC: process.env.PAYMENT_CRYPTO_BTC,
        ETH: process.env.PAYMENT_CRYPTO_ETH,
        USDT: process.env.PAYMENT_CRYPTO_USDT,
    },
};


// --- Silver Level Investment Packages ---
// This data is now managed in Firestore. See src/app/(app)/dashboard/admin/investments/page.tsx
export const silverLevelPackages = [];

// --- Golden Level Distributor Tiers ---
// This data is now managed in Firestore. See src/app/(app)/dashboard/admin/distributor/page.tsx
export const distributorTiers = [];

// --- Agent Commission Tiers ---
// This data is now managed in Firestore. See src/app/(app)/dashboard/admin/commissions/page.tsx
export const commissionTiers = [];

