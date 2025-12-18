"""
Email service for sending notifications.
Uses SMTP or can be extended to use SendGrid, AWS SES, etc.
"""
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional
import logging
from app.core.config import get_settings

logger = logging.getLogger(__name__)


class EmailService:
    def __init__(self):
        self.settings = get_settings()
        self.smtp_host = getattr(self.settings, 'smtp_host', 'localhost')
        self.smtp_port = getattr(self.settings, 'smtp_port', 587)
        self.smtp_user = getattr(self.settings, 'smtp_user', None)
        self.smtp_password = getattr(self.settings, 'smtp_password', None)
        self.from_email = getattr(self.settings, 'from_email', 'noreply@roster.dev')
        self.enabled = getattr(self.settings, 'email_enabled', False)

    def send_email(
        self,
        to_email: str,
        subject: str,
        html_content: str,
        text_content: Optional[str] = None
    ) -> bool:
        """Send an email. Returns True if successful."""
        if not self.enabled:
            logger.info(f"Email disabled. Would send to {to_email}: {subject}")
            return True

        try:
            msg = MIMEMultipart('alternative')
            msg['Subject'] = subject
            msg['From'] = self.from_email
            msg['To'] = to_email

            if text_content:
                msg.attach(MIMEText(text_content, 'plain'))
            msg.attach(MIMEText(html_content, 'html'))

            with smtplib.SMTP(self.smtp_host, self.smtp_port) as server:
                if self.smtp_user and self.smtp_password:
                    server.starttls()
                    server.login(self.smtp_user, self.smtp_password)
                server.sendmail(self.from_email, to_email, msg.as_string())

            logger.info(f"Email sent to {to_email}: {subject}")
            return True
        except Exception as e:
            logger.error(f"Failed to send email to {to_email}: {e}")
            return False

    def send_password_reset(self, to_email: str, reset_token: str, user_name: str) -> bool:
        """Send password reset email."""
        reset_url = f"{getattr(self.settings, 'frontend_url', 'http://localhost:5173')}/reset-password?token={reset_token}"

        subject = "Password Reset Request - Doctor Roster"
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .button {{
                    display: inline-block;
                    padding: 12px 24px;
                    background: #3b82f6;
                    color: white;
                    text-decoration: none;
                    border-radius: 6px;
                    margin: 20px 0;
                }}
                .footer {{ margin-top: 30px; font-size: 12px; color: #666; }}
            </style>
        </head>
        <body>
            <div class="container">
                <h2>Password Reset Request</h2>
                <p>Hi {user_name},</p>
                <p>We received a request to reset your password for the Doctor Roster system.</p>
                <p>Click the button below to reset your password:</p>
                <a href="{reset_url}" class="button">Reset Password</a>
                <p>Or copy this link: {reset_url}</p>
                <p>This link will expire in 1 hour.</p>
                <p>If you didn't request this, you can safely ignore this email.</p>
                <div class="footer">
                    <p>Doctor Roster Scheduling System</p>
                </div>
            </div>
        </body>
        </html>
        """

        text_content = f"""
        Password Reset Request

        Hi {user_name},

        We received a request to reset your password for the Doctor Roster system.

        Reset your password here: {reset_url}

        This link will expire in 1 hour.

        If you didn't request this, you can safely ignore this email.
        """

        return self.send_email(to_email, subject, html_content, text_content)

    def send_shift_notification(
        self,
        to_email: str,
        user_name: str,
        shift_details: str,
        notification_type: str = "assignment"
    ) -> bool:
        """Send shift assignment/change notification."""
        subject_map = {
            "assignment": "New Shift Assignment - Doctor Roster",
            "change": "Shift Change Notification - Doctor Roster",
            "reminder": "Upcoming Shift Reminder - Doctor Roster",
            "swap_request": "Shift Swap Request - Doctor Roster",
            "swap_approved": "Shift Swap Approved - Doctor Roster",
        }

        subject = subject_map.get(notification_type, "Notification - Doctor Roster")

        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .details {{
                    background: #f8fafc;
                    padding: 15px;
                    border-radius: 6px;
                    margin: 15px 0;
                }}
            </style>
        </head>
        <body>
            <div class="container">
                <h2>{subject}</h2>
                <p>Hi {user_name},</p>
                <div class="details">
                    {shift_details}
                </div>
                <p>Log in to view more details or manage your schedule.</p>
            </div>
        </body>
        </html>
        """

        return self.send_email(to_email, subject, html_content)

    def send_schedule_published(
        self,
        to_email: str,
        user_name: str,
        month: str,
        year: int
    ) -> bool:
        """Notify when a schedule is published."""
        subject = f"Schedule Published: {month} {year} - Doctor Roster"

        html_content = f"""
        <!DOCTYPE html>
        <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2>Schedule Published</h2>
                <p>Hi {user_name},</p>
                <p>The schedule for <strong>{month} {year}</strong> has been published.</p>
                <p>Log in to view your assignments and plan accordingly.</p>
            </div>
        </body>
        </html>
        """

        return self.send_email(to_email, subject, html_content)


# Singleton instance
_email_service: Optional[EmailService] = None


def get_email_service() -> EmailService:
    global _email_service
    if _email_service is None:
        _email_service = EmailService()
    return _email_service
