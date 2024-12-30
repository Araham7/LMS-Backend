import nodemailer from "nodemailer";

const sendEmail = async (email, subject, message ) => {
    try {
        let transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: process.env.SMTP_PORT,
            secure: process.env.SMTP_PORT == 465, // true for 465, false for others
            auth: {
                user: process.env.SMTP_USERNAME,
                pass: process.env.SMTP_PASSWORD,
            },
        });

        await transporter.sendMail({
            from: process.env.SMTP_FROM_EMAIL,
            to: email,
            subject: subject,
            html: message,
        });
    } catch (error) {
        console.error("Error sending email:", error);
        throw new Error("Email could not be sent"); // Optionally throw an error if needed
    }
};


export default sendEmail;



