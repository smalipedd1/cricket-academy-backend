const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const sendNotificationEmail = async (to, subject, message) => {
  try {
    await transporter.sendMail({
      from: `"Cricket Academy" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      text: message,
    });
    console.log(`Email sent to ${to}`);
  } catch (error) {
    console.error(`Email error to ${to}:`, error.message);
  }
};

module.exports = { sendNotificationEmail };