var nodemailer = require("nodemailer");

// Create a transporter for sending emails
const createTransporter = () => {
  // Check if all required SMTP environment variables are set
  const hasSmtpConfig =
    process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS;

  // Use real email service if configured, otherwise log to console
  if (hasSmtpConfig) {
    console.log("📧 Using SMTP email service:", process.env.SMTP_HOST);
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || "587"),
      secure: process.env.SMTP_SECURE === "true",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  // Development/fallback - log to console
  console.log("📧 Using console logging (SMTP not configured)");
  return nodemailer.createTransport({
    streamTransport: true,
    newline: "unix",
    buffer: true,
  });
};

export async function sendVerificationEmail(
  email: string,
  name: string,
  verificationToken: string
) {
  const transporter = createTransporter();

  const verificationUrl = `${process.env.NEXTAUTH_URL}/api/auth/verify-email?token=${verificationToken}`;

  const mailOptions = {
    from: process.env.EMAIL_FROM || "noreply@multisport.games",
    to: email,
    subject: "Verify your email address - Multisport Games",
    html: `
      <div style="max-width: 600px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif;">
        <h1 style="color: #333; text-align: center;">Welcome to Multisport Games!</h1>
        
        <p>Hi ${name},</p>
        
        <p>Thank you for signing up for Multisport Games. To complete your registration and start participating in the games, please verify your email address by clicking the button below:</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verificationUrl}" 
             style="background-color: #4F46E5; color: white; padding: 12px 24px; 
                    text-decoration: none; border-radius: 6px; display: inline-block;">
            Verify Email Address
          </a>
        </div>
        
        <p>If the button doesn't work, you can also copy and paste this link into your browser:</p>
        <p style="word-break: break-all; color: #666;">${verificationUrl}</p>
        
        <p>This verification link will expire in 24 hours for security reasons.</p>
        
        <p>If you didn't create an account with us, please ignore this email.</p>
        
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
        <p style="color: #666; font-size: 12px; text-align: center;">
          Multisport Games - Family & Friends Sports Competition
        </p>
      </div>
    `,
    text: `
      Welcome to Multisport Games!
      
      Hi ${name},
      
      Thank you for signing up for Multisport Games. To complete your registration, please verify your email address by visiting:
      
      ${verificationUrl}
      
      This verification link will expire in 24 hours.
      
      If you didn't create an account with us, please ignore this email.
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);

    // In development, log the email content
    if (process.env.NODE_ENV === "development") {
      console.log("Verification email sent!");
      console.log("To:", email);
      console.log("Subject: Verify your email address - Multisport Games");
      console.log("Verification URL:", verificationUrl);
      console.log("Email content logged to console");
    }

    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("Error sending verification email:", error);
    return { success: false, error: error };
  }
}

export async function sendPasswordResetEmail(
  email: string,
  name: string,
  resetToken: string
) {
  const transporter = createTransporter();

  const resetUrl = `${process.env.NEXTAUTH_URL}/auth/reset-password?token=${resetToken}`;

  const mailOptions = {
    from: process.env.EMAIL_FROM || "noreply@multisport.games",
    to: email,
    subject: "Reset your password - Multisport Games",
    html: `
      <div style="max-width: 600px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif;">
        <h1 style="color: #333; text-align: center;">Password Reset Request</h1>
        
        <p>Hi ${name},</p>
        
        <p>You requested to reset your password for your Multisport Games account. Click the button below to set a new password:</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" 
             style="background-color: #DC2626; color: white; padding: 12px 24px; 
                    text-decoration: none; border-radius: 6px; display: inline-block;">
            Reset Password
          </a>
        </div>
        
        <p>If the button doesn't work, you can also copy and paste this link into your browser:</p>
        <p style="word-break: break-all; color: #666;">${resetUrl}</p>
        
        <p>This reset link will expire in 1 hour for security reasons.</p>
        
        <p>If you didn't request a password reset, please ignore this email and your password will remain unchanged.</p>
        
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
        <p style="color: #666; font-size: 12px; text-align: center;">
          Multisport Games - Family & Friends Sports Competition
        </p>
      </div>
    `,
    text: `
      Password Reset Request
      
      Hi ${name},
      
      You requested to reset your password for your Multisport Games account. Visit this link to set a new password:
      
      ${resetUrl}
      
      This reset link will expire in 1 hour.
      
      If you didn't request a password reset, please ignore this email.
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);

    if (process.env.NODE_ENV === "development") {
      console.log("Password reset email sent!");
      console.log("To:", email);
      console.log("Reset URL:", resetUrl);
    }

    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("Error sending password reset email:", error);
    return { success: false, error: error };
  }
}
