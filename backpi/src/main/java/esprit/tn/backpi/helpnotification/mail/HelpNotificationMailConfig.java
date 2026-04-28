package esprit.tn.backpi.helpnotification.mail;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.JavaMailSenderImpl;

import java.util.Properties;

/**
 * Dedicated mail configuration for the help-notification feature.
 *
 * Creates its own JavaMailSender bean, completely separate from
 * the default spring.mail.* configuration used elsewhere in the project.
 *
 * Configuration keys (application.properties):
 *   helpnotification.mail.host       = SMTP host (e.g. smtp.gmail.com)
 *   helpnotification.mail.port       = SMTP port (e.g. 587)
 *   helpnotification.mail.username   = sender email address
 *   helpnotification.mail.password   = sender password / app password
 *   helpnotification.mail.protocol   = mail protocol (default: smtp)
 *   helpnotification.mail.smtp.auth  = enable SMTP auth (default: true)
 *   helpnotification.mail.smtp.starttls.enable = enable STARTTLS (default: true)
 *   helpnotification.mail.from       = "From" address on outgoing emails
 */
@Configuration
public class HelpNotificationMailConfig {

    @Value("${helpnotification.mail.host:smtp.gmail.com}")
    private String host;

    @Value("${helpnotification.mail.port:587}")
    private int port;

    @Value("${helpnotification.mail.username:}")
    private String username;

    @Value("${helpnotification.mail.password:}")
    private String password;

    @Value("${helpnotification.mail.protocol:smtp}")
    private String protocol;

    @Value("${helpnotification.mail.smtp.auth:true}")
    private String smtpAuth;

    @Value("${helpnotification.mail.smtp.starttls.enable:true}")
    private String starttlsEnable;

    /**
     * Dedicated JavaMailSender for help-notification emails.
     * Qualified so it does not conflict with the default Spring mail sender.
     */
    @Bean(name = "helpNotificationMailSender")
    public JavaMailSender helpNotificationMailSender() {
        JavaMailSenderImpl mailSender = new JavaMailSenderImpl();
        mailSender.setHost(host);
        mailSender.setPort(port);
        mailSender.setUsername(username);
        mailSender.setPassword(password);
        mailSender.setProtocol(protocol);

        Properties props = mailSender.getJavaMailProperties();
        props.put("mail.smtp.auth", smtpAuth);
        props.put("mail.smtp.starttls.enable", starttlsEnable);
        props.put("mail.smtp.connectiontimeout", "5000");
        props.put("mail.smtp.timeout", "5000");
        props.put("mail.smtp.writetimeout", "5000");

        return mailSender;
    }
}
