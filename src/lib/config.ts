
/**
 * @file This file contains the core business logic and configuration data 
 * for the application, such as investment packages, distributor levels, and commission tiers.
 * In a production environment, this data would be fetched from a secure backend API
 * connected to an admin control panel.
 */

// All monetary values are in KES.

// --- Payment Details ---
// WARNING: Hardcoding sensitive data like payment details on the client-side is a security risk.
// These values are publicly accessible in the browser. It is strongly recommended to
// manage these via server-side environment variables.
export const paymentDetails = {
    mobileMoney: "0712345678", // Replace with your actual mobile money number
    minipay: {
        link: "https://minipay.com/...", // Replace with your actual minipay link
        number: "0712345678", // Replace with your actual minipay number
    },
    crypto: {
        BTC: "YOUR_BITCOIN_ADDRESS_HERE",
        ETH: "YOUR_ETHEREUM_ADDRESS_HERE",
        USDT: "YOUR_USDT_ADDRESS_HERE",
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
