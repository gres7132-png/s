
'use server';
/**
 * @fileOverview Email sending utility using Nodemailer.
 * This file configures and exports a function to send emails.
 * It reads configuration from environment variables.
 */

import nodemailer from 'nodemailer';

// The admin's email address, where notifications will be sent.
const adminEmail = process.env.ADMIN_EMAIL_ADDRESS;
const emailConfig = {
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT || "587", 10),
    secure: (process.env.EMAIL_PORT === "465"), // true for 465, false for other ports
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
};

// Create a Nodemailer transporter using SMTP service details from .env
const transporter = nodemailer.createTransport(emailConfig);

interface EmailOptions {
    subject: string;
    text: string;
    html: string;
}

/**
 * Sends an email notification to the administrator.
 * Throws an error if the email service is not configured in the environment.
 * @param {EmailOptions} options The subject, text, and HTML content of the email.
 * @returns {Promise<void>}
 */
export async function sendAdminNotification(options: EmailOptions): Promise<void> {
    if (!adminEmail || !emailConfig.host || !emailConfig.auth.user || !emailConfig.auth.pass) {
        const errorMessage = "CRITICAL: Email service is not configured in environment variables (ADMIN_EMAIL_ADDRESS, EMAIL_HOST, EMAIL_USER, EMAIL_PASS). Admin notifications cannot be sent.";
        console.error(errorMessage);
        // Throw an error to ensure this failure is not silent in a production environment.
        throw new Error(errorMessage);
    }

    try {
        await transporter.sendMail({
            from: `"YieldLink Platform" <${process.env.EMAIL_USER}>`,
            to: adminEmail,
            subject: options.subject,
            text: options.text,
            html: options.html,
        });
        console.log(`Successfully sent notification email to ${adminEmail}`);
    } catch (error) {
        console.error("Failed to send notification email:", error);
        // We re-throw the error here because email notifications for financial transactions
        // are critical. The calling flow can decide whether to proceed or not.
        throw error;
    }
}

    