const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail', // or use SMTP config for Outlook, etc.
  auth: {
    user: process.env.EMAIL_USER, // your email address
    pass: process.env.EMAIL_PASS, // app password or SMTP password
  },
  logger: true,
  debug: true,
});

const sendMail = async (to, subject, text, html) => {
  try {
    await transporter.sendMail({
      from: `"Cricket Academy" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      text,
      html,
    });
    console.log(`✅ Email sent to ${to}`);
  } catch (err) {
    console.error('❌ Email send error:', err);
  }
};

module.exports = { sendMail };