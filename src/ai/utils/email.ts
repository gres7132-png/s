
'use server';
/**
 * @fileOverview Email sending utility using Nodemailer.
 * This file configures and exports a function to send emails.
 * It reads configuration from environment variables.
 */

import nodemailer from 'nodemailer';

// The admin's email address, where notifications will be sent.
const adminEmail = process.env.ADMIN_EMAIL_ADDRESS;

if (!adminEmail) {
    console.warn("WARNING: ADMIN_EMAIL_ADDRESS environment variable is not set. Email notifications will be disabled.");
}

// Create a Nodemailer transporter using SMTP service details from .env
const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT || "587", 10),
    secure: (process.env.EMAIL_PORT === "465"), // true for 465, false for other ports
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

interface EmailOptions {
    subject: string;
    text: string;
    html: string;
}

/**
 * Sends an email notification to the administrator.
 * @param {EmailOptions} options The subject, text, and HTML content of the email.
 * @returns {Promise<void>}
 */
export async function sendAdminNotification(options: EmailOptions): Promise<void> {
    if (!adminEmail || !process.env.EMAIL_HOST) {
        console.log("Email notifications are disabled. Skipping email send.");
        return; // Silently fail if email is not configured
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
        // We don't throw an error here because the main operation (e.g., withdrawal request)
        // should still succeed even if the email notification fails.
    }
}
