package esprit.tn.education.services;

import com.google.zxing.BarcodeFormat;
import com.google.zxing.client.j2se.MatrixToImageWriter;
import com.google.zxing.common.BitMatrix;
import com.google.zxing.qrcode.QRCodeWriter;
import jakarta.mail.internet.MimeMessage;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;

@Service
public class QrEmailService {

    @Autowired
    private JavaMailSender emailSender;

    private byte[] generateQRCodeImage(String text, int width, int height) throws Exception {
        QRCodeWriter qrCodeWriter = new QRCodeWriter();
        BitMatrix bitMatrix = qrCodeWriter.encode(text, BarcodeFormat.QR_CODE, width, height);
        ByteArrayOutputStream pngOutputStream = new ByteArrayOutputStream();
        MatrixToImageWriter.writeToStream(bitMatrix, "PNG", pngOutputStream);
        return pngOutputStream.toByteArray();
    }

    @Async
    public void sendBookingConfirmationEmail(String toEmail, String userName, String eventName, String seatNumber, int numberOfSeats) {
        try {
            String qrText = "Événement : " + eventName + "\n" +
                            "Réservé par : " + userName + "\n" +
                            "Place N° : " + seatNumber + "\n" +
                            "Nombre de places : " + numberOfSeats;

            byte[] qrImage = generateQRCodeImage(qrText, 350, 350);

            MimeMessage message = emailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setTo(toEmail);
            helper.setSubject("Confirmation de votre réservation : " + eventName);
            
            String htmlBody = "<h3>Bonjour " + userName + ",</h3>"
                    + "<p>Votre réservation pour l'événement <strong>" + eventName + "</strong> a été confirmée.</p>"
                    + "<p><strong>Place attribuée :</strong> N°" + seatNumber + "</p>"
                    + "<p><strong>Nombre de places :</strong> " + numberOfSeats + "</p>"
                    + "<p>Veuillez trouver ci-joint votre QR Code d'accès. Présentez-le lors de votre arrivée.</p>"
                    + "<br><p>À très bientôt !</p>";
                    
            helper.setText(htmlBody, true);
            helper.addAttachment("Billet_QR_Code.png", new ByteArrayResource(qrImage));

            emailSender.send(message);
            System.out.println("Email avec QR Code envoyé avec succès à " + toEmail);

        } catch (Exception e) {
            System.err.println("Erreur lors de l'envoi de l'email : " + e.getMessage());
            e.printStackTrace();
        }
    }
}
