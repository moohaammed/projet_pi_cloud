package esprit.tn.backpi.service;

import esprit.tn.backpi.entity.Hospital;
import esprit.tn.backpi.repository.HospitalRepository;
import org.springframework.stereotype.Service;
import java.util.List;

@Service
public class HospitalService {

    private final HospitalRepository hospitalRepository;

    public HospitalService(HospitalRepository hospitalRepository) {
        this.hospitalRepository = hospitalRepository;
    }

    public List<Hospital> getAll() {
        return hospitalRepository.findAll();
    }

    public Hospital getById(Long id) {
        return hospitalRepository.findById(id).orElse(null);
    }

    public Hospital create(Hospital hospital) {
        return hospitalRepository.save(hospital);
    }

    public Hospital update(Long id, Hospital hospital) {
        return hospitalRepository.findById(id).map(h -> {
            h.setNom(hospital.getNom());
            h.setAdresse(hospital.getAdresse());
            h.setTelephone(hospital.getTelephone());
            h.setEmail(hospital.getEmail());
            h.setSiteWeb(hospital.getSiteWeb());
            h.setDescription(hospital.getDescription());
            h.setVille(hospital.getVille());
            h.setRating(hospital.getRating());
            h.setNombreAvis(hospital.getNombreAvis());
            h.setLatitude(hospital.getLatitude());
            h.setLongitude(hospital.getLongitude());
            return hospitalRepository.save(h);
        }).orElse(null);
    }

    public void delete(Long id) {
        hospitalRepository.deleteById(id);
    }
}