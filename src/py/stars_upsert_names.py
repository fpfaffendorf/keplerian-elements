# Status: SEALED

"""
Get the stars names and greek letter from Stellarium github repository.
"""

import json
import pymongo
import shlex
from urllib import request

# Get config data.
print("Getting config data.")
config = None
with open("./etc/config.json", "r") as f:
    config = json.loads(f.read())

# Establish a connection with remote mongoDB and get the stars
# collection from the keplerianelements database.
print("Establishing a mongoDB connection.")
mongo_client = \
    pymongo.MongoClient(config["general"]["mongodb_connection_string"])
mongo_db = mongo_client["keplerianelements"]
mongo_catalogs = mongo_db["catalogs"]

# Get all the stars proper names from Stellarium files
with request.urlopen(config["catalogs"]["proper_names"]) as r:
    for line in r.read().decode("utf-8").splitlines():
        line = line.strip()
        # Check for valid line
        if line != "" and line[0] != "#":
            # Split by | char
            data = line.split("|")
            # Get Hipparcos ID
            hip = data[0]
            # Get name
            data = shlex.split(data[1])
            name = data[0][2:-1]
            # If cultures are specified
            if len(data) > 1:
                cultures = tuple(data[1].split(","))
                # Look for culture 1 (Seems to be western)
                if ("1" in cultures):
                    print(f"Upserting {hip} {name}")
                    # Prepare the upsert query.
                    query = {
                        "catalog": "hipparcos_6",
                        "stars": {
                            "$elemMatch": {
                                "id": int(hip)
                            }
                        }
                    }
                    # Prepare the document.
                    document = {
                        "$set": {
                            "stars.$.name": name
                        }
                    }
                    # Insert or update ("upsert") the document.
                    r = mongo_catalogs.update_one(query, document)

# Get all the stars greek letters from Stellarium files
with request.urlopen(config["catalogs"]["greek_letters"]) as r:
    for line in r.read().decode("utf-8").splitlines():
        line = line.strip()
        # Check for valid line
        if line != "":
            # Split by | char
            data = line.split("|")
            hip = int(data[0])
            name = data[1].strip()
            print(f"Upserting {hip} {name}")
            # Prepare the upsert query.
            query = {
                "catalog": "hipparcos_6",
                "stars": {
                    "$elemMatch": {
                        "id": int(hip)
                    }
                }
            }
            # Prepare the document.
            document = {
                "$set": {
                    "stars.$.greek": name
                }
            }
            # Insert or update ("upsert") the document.
            r = mongo_catalogs.update_one(query, document)


print("End.")
