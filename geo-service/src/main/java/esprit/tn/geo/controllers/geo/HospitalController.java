package esprit.tn.geo.controllers.geo;

import esprit.tn.geo.entities.geo.Hospital;
import esprit.tn.geo.services.geo.HospitalService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/hospitals")
@CrossOrigin(origins = "http://localhost:4200")
public class HospitalController {

    private final HospitalService hospitalService;

    public HospitalController(HospitalService hospitalService) {
        this.hospitalService = hospitalService;
    }

    @GetMapping
    public List<Hospital> getAll() {
        return hospitalService.getAll();
    }

    // id est un String en MongoDB (ObjectId)
    @GetMapping("/{id}")
    public ResponseEntity<Hospital> getById(@PathVariable String id) {
        Hospital h = hospitalService.getById(id);
        return h != null ? ResponseEntity.ok(h) : ResponseEntity.notFound().build();
    }

    @PostMapping
    public ResponseEntity<Hospital> create(@RequestBody Hospital hospital) {
        return ResponseEntity.ok(hospitalService.create(hospital));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Hospital> update(@PathVariable String id,
                                           @RequestBody Hospital hospital) {
        Hospital updated = hospitalService.update(id, hospital);
        return updated != null ? ResponseEntity.ok(updated) : ResponseEntity.notFound().build();
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable String id) {
        hospitalService.delete(id);
        return ResponseEntity.noContent().build();
    }
}