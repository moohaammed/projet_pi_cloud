package esprit.tn.geo.entities.geo;

public class RecommendedHospital {
    private String nom;
    private String gouvernorat;
    private String distanceKm;
    private String specialite;
    private String telephone;
    private String adresse;
    private Double latitude;
    private Double longitude;
    private Boolean recommande;

    public String getNom() { return nom; }
    public void setNom(String nom) { this.nom = nom; }
    public String getGouvernorat() { return gouvernorat; }
    public void setGouvernorat(String gouvernorat) { this.gouvernorat = gouvernorat; }
    public String getDistanceKm() { return distanceKm; }
    public void setDistanceKm(String distanceKm) { this.distanceKm = distanceKm; }
    public String getSpecialite() { return specialite; }
    public void setSpecialite(String specialite) { this.specialite = specialite; }
    public String getTelephone() { return telephone; }
    public void setTelephone(String telephone) { this.telephone = telephone; }
    public String getAdresse() { return adresse; }
    public void setAdresse(String adresse) { this.adresse = adresse; }
    public Double getLatitude() { return latitude; }
    public void setLatitude(Double latitude) { this.latitude = latitude; }
    public Double getLongitude() { return longitude; }
    public void setLongitude(Double longitude) { this.longitude = longitude; }
    public Boolean getRecommande() { return recommande; }
    public void setRecommande(Boolean recommande) { this.recommande = recommande; }
}
