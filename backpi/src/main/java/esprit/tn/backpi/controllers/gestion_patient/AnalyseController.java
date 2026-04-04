package esprit.tn.backpi.controllers.gestion_patient;

import esprit.tn.backpi.entities.gestion_patient.Analyse;
import esprit.tn.backpi.services.gestion_patient.IAnalyseService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/analyses")
@CrossOrigin(originPatterns = "*")
public class AnalyseController {

    private final IAnalyseService analyseService;

    public AnalyseController(IAnalyseService analyseService) {
        this.analyseService = analyseService;
    }

    @GetMapping
    public List<Analyse> getAllAnalyses() {
        return analyseService.retrieveAllAnalyses();
    }

    @PostMapping
    public Analyse createAnalyse(@RequestBody Analyse analyse) {
        return analyseService.addAnalyse(analyse);
    }

    @GetMapping("/patient/{patientId}")
    public List<Analyse> getAnalysesByPatient(@PathVariable("patientId") Long patientId) {
        return analyseService.retrieveAnalysesByPatient(patientId);
    }

    @GetMapping("/historique/patient/{patientId}")
    public List<Analyse> getHistoriqueByPatient(@PathVariable("patientId") Long patientId) {
        return analyseService.retrieveAnalysesByPatient(patientId);
    }

    @PutMapping("/{id}")
    public Analyse updateAnalyse(@PathVariable("id") Long id, @RequestBody Analyse analyse) {
        analyse.setId(id);
        return analyseService.updateAnalyse(analyse);
    }
}
