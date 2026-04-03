package esprit.tn.backpi.entities.gestion_patient;

import esprit.tn.backpi.entity.User;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class Patient {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String nom;
    private String prenom;

    // ✅ CORRECTION : int → Integer et double → Double (types wrappers nullable)
    // Problème original : Jackson ne peut pas mapper null dans un primitif int/double
    // → MismatchedInputException quand on envoie { "patient": { "id": 5 } } sans age/poids
    private Integer age;
    private Double poids;

    private String sexe;

    @OneToOne
    @JoinColumn(name = "user_id")
    private User user;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getNom() { return nom; }
    public void setNom(String nom) { this.nom = nom; }

    public String getPrenom() { return prenom; }
    public void setPrenom(String prenom) { this.prenom = prenom; }

    public Integer getAge() { return age; }
    public void setAge(Integer age) { this.age = age; }

    public Double getPoids() { return poids; }
    public void setPoids(Double poids) { this.poids = poids; }

    public String getSexe() { return sexe; }
    public void setSexe(String sexe) { this.sexe = sexe; }

    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }
}