import nodemailer from 'nodemailer';
import 'dotenv/config'
class EmailService {
   private transporter: nodemailer.Transporter | undefined;

    public initialize() {
        const host = process.env.EMAIL_HOST;
        const port = parseInt(process.env.EMAIL_PORT || '587', 10);
        const user = process.env.EMAIL_USER;
        const pass = process.env.EMAIL_PASS;

        if (!host || !port || !user || !pass) {
            console.error("[Email Service] Missing required email configuration in .env file (EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASS).");
            return;
        }

        console.log(`[Email Service] Initializing SMTP transporter for ${host}...`);

        this.transporter = nodemailer.createTransport({
            host: host,
            port: port,
            secure: port === 465, 
            auth: {
                user: user,
                pass: pass,
            },
        });
        console.log("[Email Service] SMTP transporter initialized successfully.");
    }

    async sendMail(to: string, subject: string, body: string) {
        if (!this.transporter) {
            throw new Error('Email transporter is not initialized. Check server configuration and logs.');
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

       
    }
}

export const emailService = new EmailService();