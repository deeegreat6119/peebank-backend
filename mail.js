const nodemailer = require("nodemailer");
require("dotenv").config();

const transporter = nodemailer.createTransport({
  service: "gmail",
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  auth: {
    user: process.env.APP_EMAIL,
    pass: process.env.APP_PASSWORD,
  },
});

const sendMail = async (
  emails,
  subject,
  content,
  recipientEmail,
  firstName
) => {
  try {
    const response = await transporter.sendMail({
      from: `"PEE Bank" <${process.env.EMAIL_USERNAME}>`,
      to: recipientEmail,
      subject: "Welcome to PEE Bank - Your Account is Ready!",
      html: generateWelcomeEmailHtml(firstName),
    });
    await transporter.sendMail(response);
    console.log('Welcome email sent successfully');
    return {
      success: true,
      message: "Email sent successfully",
    };
    console.log(response);
  } catch (error) {
    return {
      success: false,
      message: "Error sending email",
    };
  }
};

const sendWelcomeEmail = async (recipientEmail, firstName) => {
  return await sendMail(
    recipientEmail,
    "Welcome to PEE Bank - Your Account is Ready!",
    generateWelcomeEmailHtml(firstName),
    recipientEmail,
    firstName
  );
};

const generateWelcomeEmailHtml = (firstName) => {
  return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #0066cc; padding: 20px; text-align: center; color: white; }
          .content { padding: 20px; }
          .footer { margin-top: 20px; padding: 10px; text-align: center; font-size: 12px; color: #777; }
          .button { display: inline-block; padding: 10px 20px; background-color: #0066cc; color: white; text-decoration: none; border-radius: 5px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Welcome to PEE Bank</h1>
        </div>
        
        <div class="content">
          <p>Dear ${firstName},</p>
          
          <p>Thank you for creating your PEE Bank account! We're thrilled to have you on board.</p>
          
          <p>With PEE Bank, you can now:</p>
          <ul>
            <li>Securely manage your personal energy economy</li>
            <li>Track your energy transactions</li>
            <li>Connect with other users in our ecosystem</li>
          </ul>
          
          <p>To get started, please verify your email address by clicking the button below:</p>
          
          <p style="text-align: center;">
            <a href="#" class="button">Verify Email Address</a>
          </p>
          
          <p>If you have any questions or need assistance, don't hesitate to contact our support team at support@peebank.com.</p>
          
          <p>Best regards,<br>The PEE Bank Team</p>
        </div>
        
        <div class="footer">
          <p>© ${new Date().getFullYear()} PEE Bank. All rights reserved.</p>
          <p>If you didn't create an account with us, please ignore this email.</p>
        </div>
      </body>
      </html>
    `;
};

module.exports = { sendMail, sendWelcomeEmail };
