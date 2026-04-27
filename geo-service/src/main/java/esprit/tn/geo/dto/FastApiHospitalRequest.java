package esprit.tn.geo.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

public class FastApiHospitalRequest {
    @JsonProperty("patient_latitude")
    private Double patientLatitude;

    @JsonProperty("patient_longitude")
    private Double patientLongitude;

    @JsonProperty("type_incident")
    private String typeIncident;

    public FastApiHospitalRequest(Double patientLatitude, Double patientLongitude, String typeIncident) {
        this.patientLatitude = patientLatitude;
        this.patientLongitude = patientLongitude;
        this.typeIncident = typeIncident;
    }

    public Double getPatientLatitude() { return patientLatitude; }
    public Double getPatientLongitude() { return patientLongitude; }
    public String getTypeIncident() { return typeIncident; }
}
