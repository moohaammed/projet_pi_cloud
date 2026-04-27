-- ============================================================
-- Help Notification Feature — patient_contact table
-- This script is for reference only.
-- Since the project uses spring.jpa.hibernate.ddl-auto=update,
-- the table will be created automatically by JPA on startup.
-- ============================================================

CREATE TABLE IF NOT EXISTS patient_contact (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    patient_user_id BIGINT NOT NULL,
    contact_user_id BIGINT NULL,
    relation_type ENUM('DOCTOR', 'PARENT', 'CAREGIVER', 'RELATION') NOT NULL,
    nom VARCHAR(255) NULL,
    prenom VARCHAR(255) NULL,
    email VARCHAR(255) NULL,
    telephone VARCHAR(50) NULL,
    created_at DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6),

    CONSTRAINT fk_patient_contact_patient_user
        FOREIGN KEY (patient_user_id) REFERENCES users(id),

    CONSTRAINT fk_patient_contact_contact_user
        FOREIGN KEY (contact_user_id) REFERENCES users(id)
);
