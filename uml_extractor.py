import os
import glob
import re
import json

base_dir = r"d:\projet_pi_\projet_pi_cloud"

services = {
    "backpi": ["src/main/java/esprit/tn/backpi/entity/**/*.java"],
    "collab-service": ["src/main/java/esprit/tn/collab/entities/**/*.java"],
    "donation-service": ["src/main/java/esprit/tn/donation/entity/**/*.java"],
    "education-service": ["src/main/java/esprit/tn/education/entities/**/*.java"],
    "geo-service": ["src/main/java/esprit/tn/geo/entities/**/*.java"],
    "patient-medecin-service": ["src/main/java/esprit/tn/patientmedecin/entities/**/*.java"],
    "rendezvous-service": ["src/main/java/esprit/tn/rendezvous/entity/**/*.java"],
    "smartwatch-service": ["src/main/java/tn/esprit/smartwatchservice/entity/**/*.java"]
}

results = []

def parse_java_file(filepath, service):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Very basic parsing
    # Class name
    class_match = re.search(r'(?:public\s+)?(?:enum|class|interface)\s+(\w+)', content)
    if not class_match:
        return
    class_name = class_match.group(1)
    
    is_enum = 'enum ' in content
    
    # Persistence type
    persistence = "Plain POJO"
    if "@Entity" in content:
        persistence = "JPA/SQL"
    elif "@Document" in content:
        persistence = "MongoDB"
    elif is_enum:
        persistence = "Enum"
        
    # Extract fields
    # Look for private, protected, public fields
    # ignoring static final
    # Regex for fields: (private|protected|public) Type name;
    fields = []
    
    # remove methods (very rough) to avoid parsing method variables
    # we just grab lines that end with ; and have visibility modifiers
    lines = content.split('\n')
    for line in lines:
        line = line.strip()
        if line.startswith('private ') or line.startswith('protected ') or line.startswith('public '):
            if '(' in line and ')' in line and not line.endswith(';'): continue # method
            if 'static final' in line: continue
            
            # Simple match: private Type name [= value];
            match = re.match(r'(?:private|protected|public)\s+([\w<>\[\]\?]+)\s+(\w+)', line)
            if match:
                fields.append({"type": match.group(1), "name": match.group(2)})
                
    results.append({
        "service": service,
        "class_name": class_name,
        "persistence": persistence,
        "fields": fields,
        "is_enum": is_enum
    })

for service, patterns in services.items():
    for pattern in patterns:
        search_path = os.path.join(base_dir, service, pattern)
        files = glob.glob(search_path, recursive=True)
        for filepath in files:
            parse_java_file(filepath, service)

with open('uml_data.json', 'w') as f:
    json.dump(results, f, indent=2)
print("Extracted", len(results), "entities")
