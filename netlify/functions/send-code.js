import sql from './db.js';
import { Resend } from 'resend';

// Generate a 6-digit code
function generateCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

export default async (req, context) => {
    if (req.method !== 'POST') {
        return new Response(JSON.stringify({ error: 'Method not allowed' }), {
            status: 405,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    try {
        if (!process.env.RESEND_API_KEY) {
            return new Response(JSON.stringify({
                error: 'Email provider is not configured: RESEND_API_KEY is missing.'
            }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const { email, type } = await req.json();

        if (!email || !type) {
            return new Response(JSON.stringify({ error: 'Email and type are required' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Valid types: 'signup', 'login_2fa', 'password_change'
        const validTypes = ['signup', 'login_2fa', 'password_change', 'enable_2fa', 'disable_2fa'];
        if (!validTypes.includes(type)) {
            return new Response(JSON.stringify({ error: 'Invalid verification type' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const code = generateCode();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

        // Invalidate any existing codes for this email and type
        await sql`
            UPDATE verification_codes 
            SET used = TRUE 
            WHERE email = ${email.toLowerCase()} AND type = ${type} AND used = FALSE
        `;

        // Insert new code
        await sql`
            INSERT INTO verification_codes (email, code, type, expires_at)
            VALUES (${email.toLowerCase()}, ${code}, ${type}, ${expiresAt})
        `;

        // Send email using Resend
        const resend = new Resend(process.env.RESEND_API_KEY);

        const subjectMap = {
            'signup': 'Verify your email - Band of Men',
            'login_2fa': 'Login verification code - Band of Men',
            'password_change': 'Password change verification - Band of Men',
            'enable_2fa': 'Enable 2FA verification - Band of Men',
            'disable_2fa': 'Disable 2FA verification - Band of Men'
        };

        const messageMap = {
            'signup': 'Complete your registration',
            'login_2fa': 'Complete your login',
            'password_change': 'Confirm your password change',
            'enable_2fa': 'Confirm enabling two-factor authentication',
            'disable_2fa': 'Confirm disabling two-factor authentication'
        };

        const from =
            (process.env.RESEND_FROM && process.env.RESEND_FROM.trim()) ||
            'Band of Men <send@bandofmen.uk>';

        const { data, error } = await resend.emails.send({
            from,
            to: [email],
            subject: subjectMap[type],
            html: `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="utf-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                </head>
                <body style="margin: 0; padding: 0; background-color: #080f0d; font-family: 'Helvetica Neue', Arial, sans-serif;">
                    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #080f0d; padding: 40px 20px;">
                        <tr>
                            <td align="center">
                                <table width="100%" max-width="500" cellpadding="0" cellspacing="0" style="background-color: #0f1f1c; border: 1px solid rgba(197, 160, 89, 0.2); max-width: 500px;">
                                    <tr>
                                        <td style="padding: 40px 30px; text-align: center; border-bottom: 1px solid rgba(197, 160, 89, 0.2);">
                                            <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700; letter-spacing: 0.1em;">
                                                BAND OF <span style="color: #c5a059;">MEN</span>
                                            </h1>
                                            <p style="margin: 10px 0 0; color: #8ca39d; font-size: 12px; letter-spacing: 0.15em; text-transform: uppercase;">
                                                Professional Barbers
                                            </p>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 40px 30px; text-align: center;">
                                            <p style="margin: 0 0 10px; color: #8ca39d; font-size: 14px;">
                                                ${messageMap[type]}
                                            </p>
                                            <p style="margin: 0 0 30px; color: #e0e6e4; font-size: 16px;">
                                                Enter this verification code:
                                            </p>
                                            <div style="background: rgba(0,0,0,0.3); border: 2px solid #c5a059; padding: 20px; display: inline-block;">
                                                <span style="font-size: 32px; font-weight: 700; letter-spacing: 0.3em; color: #c5a059;">
                                                    ${code}
                                                </span>
                                            </div>
                                            <p style="margin: 30px 0 0; color: #8ca39d; font-size: 13px;">
                                                This code expires in 10 minutes.
                                            </p>
                                            <p style="margin: 10px 0 0; color: #8ca39d; font-size: 12px;">
                                                If you didn't request this code, please ignore this email.
                                            </p>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 20px 30px; text-align: center; border-top: 1px solid rgba(255,255,255,0.05);">
                                            <p style="margin: 0; color: #555; font-size: 11px;">
                                                © 2025 Band of Men Barber Salon. All rights reserved.
                                            </p>
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>
                    </table>
                </body>
                </html>
            `
        });

        if (error) {
            console.error('Email send error:', error);
            const details =
                error?.message ||
                error?.name ||
                (typeof error === 'string' ? error : null) ||
                (() => {
                    try { return JSON.stringify(error); } catch { return null; }
                })() ||
                'Unknown email provider error';
            return new Response(JSON.stringify({
                error: 'Failed to send verification email',
                // Safe to expose: helps diagnose domain verification / auth issues.
                details: String(details).slice(0, 500),
                from
            }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        return new Response(JSON.stringify({
            success: true,
            message: 'Verification code sent'
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Send code error:', error);
        return new Response(JSON.stringify({ error: 'Failed to send verification code' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
};
