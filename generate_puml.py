import json

with open('uml_data.json', 'r') as f:
    data = json.load(f)

table_lines = [
    "| Service Name | Entities Found | Persistence Type |",
    "| --- | --- | --- |"
]

services_map = {}
for item in data:
    service = item['service']
    if service not in services_map:
        services_map[service] = []
    services_map[service].append(item)

for service, items in services_map.items():
    entities = ", ".join(sorted([item['class_name'] for item in items if not item['is_enum']]))
    enums = ", ".join(sorted([item['class_name'] for item in items if item['is_enum']]))
    if enums:
        entities += f" (Enums: {enums})"
    
    # Just take persistence of first non-enum
    persistence = "Mixed"
    for item in items:
        if not item['is_enum']:
            persistence = item['persistence']
            break
            
    table_lines.append(f"| {service} | {entities} | {persistence} |")

markdown_table = "\n".join(table_lines)

# PlantUML generation
puml_lines = [
    "@startuml",
    "skinparam linetype ortho",
    "skinparam packageStyle rectangle"
]

# Ghost relationships to add later
ghost_relations = []

for service, items in services_map.items():
    puml_lines.append(f'\npackage "{service}" {{')
    
    for item in items:
        c_type = "enum" if item['is_enum'] else "class"
        puml_lines.append(f'  {c_type} {item["class_name"]} {{')
        for field in item['fields']:
            name = field['name']
            ftype = field['type']
            if name == item['class_name'] or ftype == 'class' or ftype == 'enum': 
                continue
            puml_lines.append(f'    {name} : {ftype}')
            
            # Identify ghost relationships
            if name in ['userId', 'patientId', 'medecinId', 'doctorId', 'authorId', 'ownerId']:
                ghost_relations.append(f'{item["class_name"]} ..> User : {name}')
            elif name == 'campaignId':
                ghost_relations.append(f'{item["class_name"]} ..> DonationCampaign : campaignId')
            elif name == 'activityId':
                ghost_relations.append(f'{item["class_name"]} ..> Activity : activityId')
            elif name == 'chatGroupId':
                ghost_relations.append(f'{item["class_name"]} ..> ChatGroup : chatGroupId')
            elif name == 'eventId':
                ghost_relations.append(f'{item["class_name"]} ..> Event : eventId')
            
            # Hard relationships
            if ftype.startswith('List<') or ftype.startswith('Set<'):
                inner_type = ftype[ftype.find('<')+1:ftype.find('>')]
                # Assuming embedded or one-to-many
                ghost_relations.append(f'{item["class_name"]} "1" *-- "0..*" {inner_type}')
            elif ftype in [i['class_name'] for i in items]:
                # Assuming embedded or many-to-one
                ghost_relations.append(f'{item["class_name"]} "1" *-- "1" {ftype}')
                
        puml_lines.append('  }')
        
    puml_lines.append('}')

puml_lines.append('\n\' Ghost Relationships')
for rel in set(ghost_relations):
    if "List" not in rel and "Set" not in rel and "String" not in rel:
        puml_lines.append(rel)

puml_lines.append("@enduml")

with open('uml_output.md', 'w') as f:
    f.write("### Phase 1: Deep Discovery & Inventory\n\n")
    f.write(markdown_table)
    f.write("\n\n### Phase 3: PlantUML Construction\n\n")
    f.write("```plantuml\n")
    f.write("\n".join(puml_lines))
    f.write("\n```\n")

print("Generated uml_output.md")
