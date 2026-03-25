package esprit.tn.backpi.config;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;

@ControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(Exception.class)
    public ResponseEntity<String> handleException(Exception e) {
        e.printStackTrace();
        return ResponseEntity.status(500)
                .header("Access-Control-Allow-Origin", "http://localhost:4200")
                .body("BACKEND CRASH: " + e.getClass().getName() + " - " + e.getMessage());
    }
}
