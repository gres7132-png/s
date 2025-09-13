
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
    mobileMoney: "0113628476",
    minipay: {
        link: "https://link.minipay.xyz/invite?ref=lgBQTxG8",
        number: "0781309701",
    },
    crypto: {
        BTC: "37RLrPwt7uwnWGsS9v5vQoHSGZcV8Z2kkt",
        ETH: "0xb101ACA109F490d8c0BeFa65B94B7246056c4009",
        USDT: "0x737f077D9F12f3c1DFf624f69046635C82b4A466",
    },
};


// --- Silver Level Investment Packages ---
// This data is now managed in Firestore. See src/app/(app)/dashboard/admin/investments/page.tsx
export const silverLevelPackages = [];

// --- Golden Level Contributor Tiers ---
// This data is now managed in Firestore. See src/app/(app)/dashboard/admin/distributor/page.tsx
export const distributorTiers = [];

// --- Agent Commission Tiers ---
// This data is now managed in Firestore. See src/app/(app)/dashboard/admin/commissions/page.tsx
export const commissionTiers = [];

