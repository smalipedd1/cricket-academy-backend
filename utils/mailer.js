const sgMail = require('@sendgrid/mail');
sgMail.setApiKey(process.env.SENDGRID_API_KEY);
console.log('Loaded API key:', process.env.SENDGRID_API_KEY?.slice(0,5));

const sendMail = async (to, subject, text, html) => {
  try {
    await sgMail.send({
      to,
      from: process.env.EMAIL_USER, // must be verified sender
      subject,
      text,
      html,
    });
    console.log(`✅ Email sent to ${to}`);
  } catch (err) {
    console.error('❌ Email send error:', err.response?.body || err);
  }
};

module.exports = { sendMail };