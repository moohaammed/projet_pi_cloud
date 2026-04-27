package esprit.tn.backpi.helpnotification.mail;

import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.Map;

/**
 * Builds professional HTML email content for automatic heart-rate danger alerts.
 *
 * Produces inline-CSS HTML suitable for all major email clients.
 * Used exclusively by HelpNotificationMailService for automatic alerts.
 */
public final class HelpNotificationEmailTemplate {

    private HelpNotificationEmailTemplate() { /* utility class */ }

    /** Human-readable condition descriptions */
    private static final Map<String, String> CONDITION_DESCRIPTIONS = Map.of(
            "TACHYCARDIE",        "Tachycardia — Abnormally high heart rate (>120 BPM sustained for 15 seconds)",
            "BRADYCARDIE",        "Bradycardia — Abnormally low heart rate (<50 BPM sustained for 15 seconds)",
            "VARIATION_ANORMALE", "Abnormal Variation — Sudden significant change in heart rate (>30 BPM shift)",
            "DONNEE_INCOHERENTE", "Incoherent Data — Impossible heart rate value detected (0 or >220 BPM)",
            "PIC_SOUDAIN",        "Sudden Spike — Rapid heart rate fluctuation detected (>40 BPM spread in 3 seconds)"
    );

    /**
     * Get human-readable description for a condition type.
     */
    public static String getConditionDescription(String conditionType) {
        return CONDITION_DESCRIPTIONS.getOrDefault(conditionType, conditionType);
    }

    /**
     * Build the full HTML email body for a heart-rate danger alert.
     *
     * @param patientName          full name of the patient
     * @param conditionType        raw condition type (e.g. "TACHYCARDIE")
     * @param alertMessage         original alert message from smartwatch-service
     * @param bpm                  the BPM value that triggered the alert
     * @param detectedAt           when the condition was detected
     * @param contactName          name of the person receiving this email
     * @return complete HTML string ready to be set as email body
     */
    public static String buildAlertHtml(String patientName,
                                        String conditionType,
                                        String alertMessage,
                                        Integer bpm,
                                        Instant detectedAt,
                                        String contactName) {

        String conditionReadable = getConditionDescription(conditionType);
        String formattedTime = DateTimeFormatter.ofPattern("MMMM dd, yyyy — HH:mm:ss")
                .withZone(ZoneId.systemDefault())
                .format(detectedAt != null ? detectedAt : Instant.now());

        return """
                <!DOCTYPE html>
                <html lang="en">
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>MediSync — Heart-Rate Danger Alert</title>
                </head>
                <body style="margin:0;padding:0;background-color:#f4f4f7;font-family:'Segoe UI',Roboto,Arial,sans-serif;">
                
                <!-- Outer wrapper -->
                <table role="presentation" width="100%%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f7;padding:30px 0;">
                <tr><td align="center">
                
                <!-- Main card -->
                <table role="presentation" width="600" cellpadding="0" cellspacing="0"
                       style="background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
                
                    <!-- ═══ HEADER ═══ -->
                    <tr>
                        <td style="background:linear-gradient(135deg,#d32f2f,#b71c1c);padding:28px 40px;text-align:center;">
                            <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;letter-spacing:0.5px;">
                                &#x1F6A8; URGENT HEART-RATE ALERT
                            </h1>
                            <p style="margin:6px 0 0;color:rgba(255,255,255,0.85);font-size:13px;">
                                MediSync Automated Monitoring System
                            </p>
                        </td>
                    </tr>
                
                    <!-- ═══ WARNING BANNER ═══ -->
                    <tr>
                        <td style="background-color:#fff3e0;border-left:5px solid #ff9800;padding:18px 35px;">
                            <p style="margin:0;color:#e65100;font-size:15px;font-weight:600;">
                                &#x26A0;&#xFE0F; A dangerous heart-rate condition has been detected for one of your patients.
                                Immediate attention may be required.
                            </p>
                        </td>
                    </tr>
                
                    <!-- ═══ GREETING ═══ -->
                    <tr>
                        <td style="padding:24px 40px 8px;">
                            <p style="margin:0;color:#333333;font-size:15px;">
                                Dear <strong>%s</strong>,
                            </p>
                        </td>
                    </tr>
                
                    <!-- ═══ PATIENT INFORMATION ═══ -->
                    <tr>
                        <td style="padding:12px 40px;">
                            <table role="presentation" width="100%%" cellpadding="0" cellspacing="0"
                                   style="background-color:#f8f9fa;border-radius:8px;border:1px solid #e0e0e0;">
                                <tr>
                                    <td style="padding:18px 24px;">
                                        <p style="margin:0 0 4px;color:#757575;font-size:11px;text-transform:uppercase;letter-spacing:1px;font-weight:600;">
                                            Patient
                                        </p>
                                        <p style="margin:0;color:#212121;font-size:18px;font-weight:700;">
                                            %s
                                        </p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                
                    <!-- ═══ CONDITION DETAILS ═══ -->
                    <tr>
                        <td style="padding:8px 40px;">
                            <table role="presentation" width="100%%" cellpadding="0" cellspacing="0"
                                   style="background-color:#fbe9e7;border-radius:8px;border:1px solid #ffccbc;">
                                <tr>
                                    <td style="padding:18px 24px;">
                                        <p style="margin:0 0 4px;color:#bf360c;font-size:11px;text-transform:uppercase;letter-spacing:1px;font-weight:600;">
                                            Detected Condition
                                        </p>
                                        <p style="margin:0 0 10px;color:#d32f2f;font-size:17px;font-weight:700;">
                                            %s
                                        </p>
                                        <p style="margin:0 0 6px;color:#555555;font-size:13px;">
                                            %s
                                        </p>
                                        <p style="margin:0;color:#555555;font-size:13px;">
                                            <strong>Recorded BPM:</strong> %s
                                        </p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                
                    <!-- ═══ TIMESTAMP ═══ -->
                    <tr>
                        <td style="padding:8px 40px;">
                            <table role="presentation" width="100%%" cellpadding="0" cellspacing="0"
                                   style="background-color:#e3f2fd;border-radius:8px;border:1px solid #bbdefb;">
                                <tr>
                                    <td style="padding:14px 24px;">
                                        <p style="margin:0 0 4px;color:#1565c0;font-size:11px;text-transform:uppercase;letter-spacing:1px;font-weight:600;">
                                            Detection Timestamp
                                        </p>
                                        <p style="margin:0;color:#212121;font-size:14px;font-weight:600;">
                                            %s
                                        </p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                
                    <!-- ═══ ACTION REQUIRED ═══ -->
                    <tr>
                        <td style="padding:20px 40px;">
                            <table role="presentation" width="100%%" cellpadding="0" cellspacing="0"
                                   style="background-color:#d32f2f;border-radius:8px;">
                                <tr>
                                    <td style="padding:18px 24px;text-align:center;">
                                        <p style="margin:0;color:#ffffff;font-size:15px;font-weight:700;">
                                            &#x1F3E5; PLEASE CHECK ON THE PATIENT IMMEDIATELY
                                        </p>
                                        <p style="margin:8px 0 0;color:rgba(255,255,255,0.9);font-size:13px;">
                                            Contact the patient or their caregivers to verify their current status
                                            and provide medical assistance if needed.
                                        </p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                
                    <!-- ═══ FOOTER ═══ -->
                    <tr>
                        <td style="background-color:#fafafa;border-top:1px solid #eeeeee;padding:20px 40px;">
                            <p style="margin:0 0 6px;color:#9e9e9e;font-size:11px;text-align:center;">
                                This is an automated alert from the <strong>MediSync</strong> health monitoring platform.
                            </p>
                            <p style="margin:0 0 6px;color:#9e9e9e;font-size:11px;text-align:center;">
                                This notification was generated because the patient's heart-rate data
                                matched a danger condition pattern that was confirmed over a monitoring period.
                            </p>
                            <p style="margin:0;color:#bdbdbd;font-size:10px;text-align:center;">
                                &copy; MediSync — Alzheimer Patient Monitoring &amp; Care Platform
                            </p>
                        </td>
                    </tr>
                
                </table>
                <!-- /Main card -->
                
                </td></tr>
                </table>
                <!-- /Outer wrapper -->
                
                </body>
                </html>
                """.formatted(
                contactName != null ? contactName : "Caregiver",
                patientName != null ? patientName : "Unknown Patient",
                conditionType != null ? conditionType : "UNKNOWN",
                conditionReadable,
                bpm != null ? bpm.toString() + " BPM" : "N/A",
                formattedTime
        );
    }
}
