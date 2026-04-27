package esprit.tn.backpi.helpnotification.mail;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

import java.time.Instant;

/**
 * Sends professional HTML danger-alert emails for the help-notification feature.
 *
 * Uses the dedicated {@code helpNotificationMailSender} bean configured in
 * {@link HelpNotificationMailConfig}, completely separate from the default
 * Spring mail sender used elsewhere in the project.
 *
 * Delegates HTML rendering to {@link HelpNotificationEmailTemplate}.
 */
@Service
public class HelpNotificationMailService {

    private final JavaMailSender mailSender;

    @Value("${helpnotification.mail.from:noreply@medisync.com}")
    private String fromAddress;

    public HelpNotificationMailService(
            @Qualifier("helpNotificationMailSender") JavaMailSender mailSender) {
        this.mailSender = mailSender;
    }

    /**
     * Send a professional HTML danger-alert email to a patient's contact.
     *
     * @param toEmail            recipient email address
     * @param patientName        full name of the patient
     * @param conditionType      condition type (e.g. "TACHYCARDIE")
     * @param alertMessage       original alert message from smartwatch-service
     * @param bpm                the BPM reading that triggered the alert
     * @param detectedAt         timestamp when the condition was detected
     * @param contactName        name of the contact receiving this email
     */
    public void sendDangerAlertEmail(String toEmail,
                                     String patientName,
                                     String conditionType,
                                     String alertMessage,
                                     Integer bpm,
                                     Instant detectedAt,
                                     String contactName) {
        try {
            MimeMessage mimeMessage = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(mimeMessage, true, "UTF-8");

            helper.setFrom(fromAddress);
            helper.setTo(toEmail);
            helper.setSubject("🚨 URGENT — Heart-Rate Danger Alert for " + patientName);

            String htmlContent = HelpNotificationEmailTemplate.buildAlertHtml(
                    patientName, conditionType, alertMessage, bpm, detectedAt, contactName
            );
            helper.setText(htmlContent, true); // true = HTML

            mailSender.send(mimeMessage);

            System.out.println("[HelpNotification-Mail] ✅ HTML danger alert email sent to: " + toEmail
                    + " (patient: " + patientName + ", condition: " + conditionType + ")");

        } catch (MessagingException e) {
            System.err.println("[HelpNotification-Mail] ❌ Failed to send HTML email to " + toEmail
                    + ": " + e.getMessage());
        } catch (Exception e) {
            System.err.println("[HelpNotification-Mail] ❌ Unexpected error sending email to " + toEmail
                    + ": " + e.getMessage());
        }
    }
}
