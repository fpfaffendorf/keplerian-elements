# Status: SEALED

"""
Fill mongoDB constellation collection with IAU constellation names and 
english translation from a Stellarium file.
"""

import json
import pymongo
import re   # Regular expressions.
from urllib import request

# Get config data.
print("Getting config data.")
config = None
with open("./etc/config.json", "r") as f:
    config = json.loads(f.read())

# Establish a connection with remote mongoDB and get the constellations
# collection from the keplerianelements database.
print("Establishing a mongoDB connection.")
mongo_client = \
    pymongo.MongoClient(config["general"]["mongodb_connection_string"])
mongo_db = mongo_client["keplerianelements"]
mongo_constellations = mongo_db["constellations"]

# Request constellation names from the Stellarium github repository.
print("Request data from Stellarium github repository.")
with request.urlopen(config["constellations"]["stellarium_names"]) as r:
    lines = r.read().decode("utf-8").splitlines()
    # Iterate each line in the file.
    for line in lines:
        # Parse data.
        data = re.split(r"\t+", line.strip())
        # Prepare the upsert query.
        query = {
            "abbreviation_iau": data[0]
        }
        # Prepare constellation document.
        constellation = {
            "$set": {
                "abbreviation_iau": data[0],
                "name": data[1].replace('"', "")
            }
        }
        # Insert or update ("upsert") the document.
        print(f"Upserting constellation {data[0]}.")
        mongo_constellations.update_one(query, constellation, upsert=True)
print("End.")
