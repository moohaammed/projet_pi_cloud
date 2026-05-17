import pymongo
from bson import json_util
import json

uri = "mongodb+srv://yosr:yosr@cluster0.a5ojkea.mongodb.net/patient_medecin_db?retryWrites=true&w=majority&appName=Cluster0"
client = pymongo.MongoClient(uri)
db = client.patient_medecin_db
collection = db.patients

for patient in collection.find():
    print(json.dumps(patient, default=json_util.default, indent=2))
