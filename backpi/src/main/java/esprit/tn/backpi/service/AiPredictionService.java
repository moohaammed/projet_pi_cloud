package esprit.tn.backpi.service;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import java.util.HashMap;
import java.util.Map;

@Service
public class AiPredictionService {

    private final String API_URL = "http://127.0.0.1:8000/predict";
    private final String RISK_API_URL = "http://127.0.0.1:8000/predict-risk";


    public Double predict(Map<String, Object> input) {
        RestTemplate restTemplate = new RestTemplate();

        Map<String, Object> response =
                restTemplate.postForObject(API_URL, input, Map.class);

        return Double.parseDouble(response.get("cdr").toString());
    }
    public Map<String, Object> predictRisk(Map<String, Object> input) {
        RestTemplate restTemplate = new RestTemplate();

        return restTemplate.postForObject(RISK_API_URL, input, Map.class);
}
}
