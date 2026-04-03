require("dotenv").config();
const nodemailer = require("nodemailer");

// what transporter does is, it creates a connection with the email server, and then we can use that connection to send emails, in our case we will be using Gmail as our email service provider, so we will create a transporter using Gmail's SMTP server, and we will use OAuth2 for authentication, which is more secure than using username and password, because with OAuth2 we can generate access tokens that have limited scope and expiration time, so even if someone gets hold of the token, they won't be able to do much with it, and we can also revoke the token if needed, without affecting the user's actual email account credentials.
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    type: "OAuth2",
    user: process.env.EMAIL_USER,
    clientId: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    refreshToken: process.env.REFRESH_TOKEN,
  },
});

// Verify the connection configuration
transporter.verify((error, success) => {
  if (error) {
    console.error("Error connecting to email server:", error);
  } else {
    console.log("Email server is ready to send messages");
  }
});

// Function to send email
const sendEmail = async (to, subject, text, html) => {
  try {
    const info = await transporter.sendMail({
      from: `"Banking System" <${process.env.EMAIL_USER}>`, // sender address
      to, // list of receivers
      subject, // Subject line
      text, // plain text body
      html, // html body
    });

    console.log("Message sent: %s", info.messageId);
    console.log("Preview URL: %s", nodemailer.getTestMessageUrl(info));
  } catch (error) {
    console.error("Error sending email:", error);
  }
};

async function sendRegistrationEmail(userEmail, name) {
  const subject = "Welcome to Banking System!";
  const text = `Hi ${name},\n\nThank you for registering with our Banking System. We're excited to have you on board! If you have any questions or need assistance, feel free to reach out to our support team.\n\nBest regards,\nBanking System Team`;
  const html = `<p>Hi ${name},</p><p>Thank you for registering with our <b>Banking System</b>. We're excited to have you on board! If you have any questions or need assistance, feel free to reach out to our support team.</p><p>Best regards,<br/>Banking System Team</p>`;
  await sendEmail(userEmail, subject, text, html);
}
async function sendTransactionEmail(
  userEmail,
  name,
  amount,
  fromAccount,
  toAccount,
) {
  const subject = "Transaction Alert from Banking System";
  const text = `Hi ${name},\n\nA transaction of $${amount} has been made from your account (${fromAccount}) to account (${toAccount}). If you did not authorize this transaction, please contact our support team immediately.\n\nBest regards,\nBanking System Team`;
  const html = `<p>Hi ${name},</p><p>A transaction of <b>$${amount}</b> has been made from your account (<b>${fromAccount}</b>) to account (<b>${toAccount}</b>). If you did not authorize this transaction, please contact our support team immediately.</p><p>Best regards,<br/>Banking System Team</p>`;
  await sendEmail(userEmail, subject, text, html);
}
async function sendTransactionFailureEmail(
  userEmail,
  name,
  amount,
  fromAccount,
  toAccount,
) {
  const subject = "Transaction Failed Alert from Banking System";
  const text = `Hi ${name},\n\nWe regret to inform you that a transaction of $${amount} from your account (${fromAccount}) to account (${toAccount}) has failed. Please check your account balance and try again. If you continue to experience issues, please contact our support team for assistance.\n\nBest regards,\nBanking System Team`;
  const html = `<p>Hi ${name},</p><p>We regret to inform you that a transaction of <b>$${amount}</b> from your account (<b>${fromAccount}</b>) to account (<b>${toAccount}</b>) has failed. Please check your account balance and try again. If you continue to experience issues, please contact our support team for assistance.</p><p>Best regards,<br/>Banking System Team</p>`;
  await sendEmail(userEmail, subject, text, html);
}

module.exports = {
  sendEmail,
  sendRegistrationEmail,
  sendTransactionEmail,
  sendTransactionFailureEmail,
};
