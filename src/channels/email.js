import nodemailer from 'nodemailer';

// Create transporter based on environment
const createTransporter = () => {
  // For development, use a test account or local SMTP
  if (process.env.NODE_ENV === 'development') {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.ethereal.email',
      port: process.env.SMTP_PORT || 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER || 'test@example.com',
        pass: process.env.SMTP_PASS || 'testpass'
      }
    });
  }

  // For production, use SendGrid or other service
  return nodemailer.createTransport({
    service: 'SendGrid',
    auth: {
      user: process.env.SENDGRID_USERNAME || 'apikey',
      pass: process.env.SENDGRID_API_KEY
    }
  });
};

const transporter = createTransporter();

export async function sendEmail(to, subject, html) {
  try {
    const mailOptions = {
      from: process.env.SMTP_FROM || process.env.SENDGRID_FROM || 'noreply@yourcompany.com',
      to,
      subject,
      html,
      headers: {
        'X-Priority': '1',
        'X-MSMail-Priority': 'High',
        'Importance': 'high'
      }
    };

    const result = await transporter.sendMail(mailOptions);
    
    console.log(`✅ Email sent successfully to ${to}`);
    
    return {
      success: true,
      messageId: result.messageId,
      channel: 'email',
      recipient: to
    };
  } catch (error) {
    console.error(` Email sending failed to ${to}:`, error.message);
    throw new Error(`Email delivery failed: ${error.message}`);
  }
}

// Test email function for development
export async function testEmail() {
  try {
    const result = await sendEmail(
      'test@example.com',
      'Test Email',
      '<h1>Test Email</h1><p>This is a test email from the notification service.</p>'
    );
    console.log(' Test email sent successfully');
    return result;
  } catch (error) {
    console.error(' Test email failed:', error.message);
    throw error;
  }
} 