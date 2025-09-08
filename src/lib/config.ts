
/**
 * @file This file contains the core business logic and configuration data 
 * for the application, such as investment packages, distributor levels, and commission tiers.
 * In a production environment, this data would be fetched from a secure backend API
 * connected to an admin control panel.
 */

// All monetary values are in KES.

// --- Payment Details ---
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
export const silverLevelPackages = [
  { name: "Silver Level 1", price: 1300, dailyReturn: 166, duration: 16, totalReturn: 2656 },
  { name: "Silver Level 2", price: 2800, dailyReturn: 393, duration: 15, totalReturn: 5895 },
  { name: "Silver Level 3", price: 3900, dailyReturn: 242, duration: 35, totalReturn: 8470 },
  { name: "Silver Level 4", price: 9750, dailyReturn: 318, duration: 70, totalReturn: 22260 },
  { name: "Silver Level 5", price: 20800, dailyReturn: 390, duration: 130, totalReturn: 50700 },
  { name: "Silver Level 6", price: 39000, dailyReturn: 512, duration: 200, totalReturn: 102400 },
  { name: "Silver Level 7", price: 65000, dailyReturn: 670, duration: 260, totalReturn: 174200 },
  { name: "Silver Level 8", price: 117000, dailyReturn: 1002, duration: 360, totalReturn: 360720 },
];

// --- Golden Level Distributor Tiers ---
export const distributorTiers = [
  { level: 'V1', monthlyIncome: 6500, purchasedProducts: 2, deposit: 39000 },
  { level: 'V2', monthlyIncome: 13000, purchasedProducts: 3, deposit: 78000 },
  { level: 'V3', monthlyIncome: 26000, purchasedProducts: 4, deposit: 156000 },
  { level: 'V4', monthlyIncome: 43333, purchasedProducts: 5, deposit: 260000 },
  { level: 'V5', monthlyIncome: 108333, purchasedProducts: 6, deposit: 650000 },
];

// --- Agent Commission Tiers ---
export const commissionTiers = [
  { referrals: 20, commission: 6500 },
  { referrals: 75, commission: 20000 },
  { referrals: 200, commission: 35000 },
  { referrals: 500, commission: 55000 },
  { referrals: 1000, commission: 120000 },
  { referrals: 2000, commission: 300000 },
];
