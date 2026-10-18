
import "dotenv/config";
import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.ZOHO_SMTP_HOST || "smtp.zoho.com",
  port: 465,
  secure: true,
  auth: {
    user: process.env.ZOHO_EMAIL,
    pass: process.env.ZOHO_APP_PASSWORD,
  },
});

async function testEmail() {
  try {
    await transporter.verify();
    console.log("Zoho SMTP connection successful!");

    const info = await transporter.sendMail({
      from: `"ToOseA Garden" <${process.env.ZOHO_EMAIL}>`,
      to: `omoikejoy34@gmail.com`,
      subject: "ToOseA Garden - Email Test",
      text: "Congratulations! Your ToOseA Garden email service is working.",
      html: `
        <div style="font-family: Arial, sans-serif; padding: 24px;">
          <h2 style="color: #063b2a;">ToOseA Garden</h2>
          <p>Your Zoho Mail integration is working correctly.</p>
          <p>You can now test staff welcome and booking confirmation emails.</p>
        </div>
      `,
    });

    console.log("Test email sent successfully:", info.messageId);
  } catch (error) {
    console.error("Email test failed:", error.message);
  }
}

testEmail();