import pymysql
import pymongo
from datetime import datetime

# ==========================================
# CONFIGURATION
# ==========================================
# MySQL settings (adjust to match your local setup)
MYSQL_HOST = 'localhost'
MYSQL_USER = 'root'
MYSQL_PASSWORD = '' # Replace if your root has a password
MYSQL_DB = 'alzheimer_db'

# MongoDB settings (adjust to match your Atlas URI or local)
# To migrate to Atlas: replace with your Atlas URI
MONGO_URI = 'mongodb+srv://yosr:yosr@cluster0.a5ojkea.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0'
MONGO_DB = 'users'

def get_mysql_connection():
    return pymysql.connect(
        host=MYSQL_HOST,
        user=MYSQL_USER,
        password=MYSQL_PASSWORD,
        database=MYSQL_DB,
        cursorclass=pymysql.cursors.DictCursor
    )

def migrate():
    print("Connecting to MySQL...")
    try:
        mysql_conn = get_mysql_connection()
    except Exception as e:
        print(f"Failed to connect to MySQL: {e}")
        return

    print("Connecting to MongoDB...")
    mongo_client = pymongo.MongoClient(MONGO_URI)
    db = mongo_client[MONGO_DB]
    users_col = db['users']
    contacts_col = db['patient_contact']
    seq_col = db['database_sequences']

    max_user_id = 0
    max_contact_id = 0

    with mysql_conn.cursor() as cursor:
        # Migrate Users
        print("Migrating users...")
        cursor.execute("SELECT * FROM users")
        users = cursor.fetchall()
        for u in users:
            # Map SQL types to MongoDB
            mongo_user = {
                '_id': int(u['id']), # Preserve Long ID
                'nom': u['nom'],
                'prenom': u['prenom'],
                'email': u['email'],
                'password': u['password'],
                'role': u['role'],
                'telephone': u.get('telephone'),
                'image': u.get('image'),
                'actif': bool(u['actif']),
                'is_live': bool(u.get('is_live', False)),
                'created_at': u.get('created_at') or datetime.now(),
                'patient_id': int(u['patient_id']) if u.get('patient_id') else None,
                'relation_id': int(u['relation_id']) if u.get('relation_id') else None,
                'lien_avec_patient': u.get('lien_avec_patient'),
                'fcm_token': u.get('fcm_token'),
                '_class': 'esprit.tn.backpi.entity.User' # Spring Data Type Hint
            }
            try:
                users_col.replace_one({'_id': mongo_user['_id']}, mongo_user, upsert=True)
                if mongo_user['_id'] > max_user_id:
                    max_user_id = mongo_user['_id']
            except Exception as e:
                 print(f"Error migrating user {mongo_user['_id']}: {e}")

        print(f"Successfully migrated {len(users)} users.")

        # Migrate PatientContacts
        print("Migrating patient_contact...")
        try:
            cursor.execute("SELECT * FROM patient_contact")
            contacts = cursor.fetchall()
            for c in contacts:
                mongo_contact = {
                    '_id': int(c['id']), # Preserve Long ID
                    'patient_user_id': int(c['patient_user_id']) if c.get('patient_user_id') else None,
                    'contact_user_id': int(c['contact_user_id']) if c.get('contact_user_id') else None,
                    'relation_type': c['relation_type'],
                    'nom': c['nom'],
                    'prenom': c['prenom'],
                    'email': c['email'],
                    'telephone': c.get('telephone'),
                    'created_at': c.get('created_at') or datetime.now(),
                    '_class': 'esprit.tn.backpi.entity.PatientContact'
                }
                try:
                    contacts_col.replace_one({'_id': mongo_contact['_id']}, mongo_contact, upsert=True)
                    if mongo_contact['_id'] > max_contact_id:
                        max_contact_id = mongo_contact['_id']
                except Exception as e:
                     print(f"Error migrating contact {mongo_contact['_id']}: {e}")
            print(f"Successfully migrated {len(contacts)} contacts.")
        except Exception as e:
             print("No patient_contact data migrated or table not found:", e)

    mysql_conn.close()

    # Initialize sequence generators
    print("Initializing MongoDB sequences...")
    if max_user_id > 0:
        seq_col.replace_one(
            {'_id': 'users_sequence'},
            {'_id': 'users_sequence', 'seq': max_user_id},
            upsert=True
        )
        print(f"Set users_sequence to {max_user_id}")

    if max_contact_id > 0:
        seq_col.replace_one(
            {'_id': 'patient_contact_sequence'},
            {'_id': 'patient_contact_sequence', 'seq': max_contact_id},
            upsert=True
        )
        print(f"Set patient_contact_sequence to {max_contact_id}")

    print("Migration complete!")

if __name__ == "__main__":
    migrate()
