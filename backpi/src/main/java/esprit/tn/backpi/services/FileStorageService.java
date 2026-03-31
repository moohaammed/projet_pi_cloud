package esprit.tn.backpi.services;

import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.*;
import java.util.UUID;

@Service
public class FileStorageService {
    private final Path fileStorageLocation = Paths.get("uploads/media").toAbsolutePath().normalize();

    public FileStorageService() {
        try {
            Files.createDirectories(this.fileStorageLocation);
        } catch (Exception ex) {
            throw new RuntimeException("Could not create the directory where the uploaded files will be stored.", ex);
        }
    }

    public String storeFile(MultipartFile file) {
        if (file == null || file.isEmpty()) return null;
        try {
            // Generate unique filename and sanitize spaces/special chars
            String originalFileName = Paths.get(file.getOriginalFilename()).getFileName().toString();
            String safeFileName = originalFileName.replaceAll("[^a-zA-Z0-9\\.\\-_]", "_");
            String fileName = UUID.randomUUID().toString() + "_" + safeFileName;
            Path targetLocation = this.fileStorageLocation.resolve(fileName);
            Files.copy(file.getInputStream(), targetLocation, StandardCopyOption.REPLACE_EXISTING);
            return "/uploads/media/" + fileName; // Return the relative URL path mapping
        } catch (IOException ex) {
            throw new RuntimeException("Could not store file. Please try again!", ex);
        }
    }
}
