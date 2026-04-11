package esprit.tn.backpi.controller;

import esprit.tn.backpi.entity.Hospital;
import esprit.tn.backpi.service.HospitalService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/hospitals")
public class HospitalController {

    private final HospitalService hospitalService;

    public HospitalController(HospitalService hospitalService) {
        this.hospitalService = hospitalService;
    }

    @GetMapping
    public List<Hospital> getAll() {
        return hospitalService.getAll();
    }

    @GetMapping("/{id}")
    public ResponseEntity<Hospital> getById(@PathVariable Long id) {
        Hospital h = hospitalService.getById(id);
        return h != null ? ResponseEntity.ok(h) : ResponseEntity.notFound().build();
    }

    @PostMapping
    public ResponseEntity<Hospital> create(@RequestBody Hospital hospital) {
        return ResponseEntity.ok(hospitalService.create(hospital));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Hospital> update(@PathVariable Long id,
                                           @RequestBody Hospital hospital) {
        Hospital updated = hospitalService.update(id, hospital);
        return updated != null ? ResponseEntity.ok(updated) : ResponseEntity.notFound().build();
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        hospitalService.delete(id);
        return ResponseEntity.noContent().build();
    }
}