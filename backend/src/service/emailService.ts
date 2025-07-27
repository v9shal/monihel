import nodemailer from 'nodemailer';

class EmailService {
    private transporter: nodemailer.Transporter | undefined;

    async initialize() {
        const testAccount = await nodemailer.createTestAccount();

        console.log("--- Ethereal Test Account ---");
        console.log(`[Email Service] User: ${testAccount.user}`);
        console.log(`[Email Service] Pass: ${testAccount.pass}`);
        console.log("-----------------------------");

        this.transporter = nodemailer.createTransport({
            host: 'smtp.ethereal.email',
            port: 587,
            secure: false, 
            auth: {
                user: testAccount.user,
                pass: testAccount.pass,
            },
        });
    }

    async sendMail(to: string, subject: string, body: string) {
        if (!this.transporter) {
            throw new Error('Email service is not initialized. Call initialize() first.');
        }

        const mailOptions = {
            from: '"API Monitoring System" ',
            to: to,
            subject: subject,
            html: `
                <div style="font-family: sans-serif; line-height: 1.6;">
                    <h2>API Monitor Alert</h2>
                    <p>${body}</p>
                    <hr>
                    <p style="font-size: 0.8em; color: #888;">This is an automated notification.</p>
                </div>
            `,
        };

        const info = await this.transporter.sendMail(mailOptions);

        const previewUrl = nodemailer.getTestMessageUrl(info);
        console.log(`[Email Service] Message sent: ${info.messageId}`);
        console.log(`[Email Service] Preview URL: ${previewUrl}`);

        if (!previewUrl) {
            console.warn("[Email Service] Ethereal did not return a preview URL. Check console for credentials.");
        }
    }
}

export const emailService = new EmailService();