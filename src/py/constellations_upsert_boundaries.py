# Status: SEALED

"""
Get constellations boundaries from IAU web site.
"""

import json
import math
import pymongo
from urllib import request
from mods.coordinates_document import CoordinatesDocument


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

# Get all constellations from mongoDB collection.
print("Request constellations from mongoDB.")
cursor = mongo_constellations.find({})
for document in cursor:
    print(f'Processing {document["abbreviation_iau"]}.')
    abbreviation_iau_lower = document["abbreviation_iau"].lower()
    # Determine if constellation has more than 1 part.
    parts = [1]
    if (abbreviation_iau_lower == "ser"):
        parts = [1, 2]
    # Prepare boundaries list
    boundaries_j2000 = {
        "parts": []
    }
    # Iterate all constellation parts.
    for part in parts:
        print(f'Part {part}.')
        # Determine if part number should be part of the requets.
        if (len(parts) == 1):
            part_r = ""
        else:
            part_r = str(part)
        # Append part
        boundaries_j2000["parts"].append({
            "vertices": []
        })
        # Request.
        with request.urlopen(
                config["constellations"]["iau_boundaries_url"] +
                abbreviation_iau_lower +
                part_r +
                ".txt") as r:
            for line in r.read().decode("utf-8").splitlines():
                line = line.strip()
                # Determine RA and DEC only if line is well formated.
                if ((len(line) >= 29) and (len(line) <= 30)):
                    ra_deg = (float(line[0:2]) * 15) + \
                        (float(line[3:5]) * 15 / 60) + \
                        (float(line[6:13]) * 15 / 3600)
                    dec_deg = float(line[14:25])
                    boundaries_j2000["parts"][part - 1]["vertices"].append({
                        "coordinates":
                        CoordinatesDocument.get(ra_deg, dec_deg)
                    })
        # Prepare the update query.
        query = {
            "abbreviation_iau": document["abbreviation_iau"]
        }
        # Document update.
        constellation = {
            "$set": {
                "boundaries_j2000.iau": boundaries_j2000
            }
        }
        # Update the constellation document with new information.
        print(f'Updating constellation {document["abbreviation_iau"]}.')
        mongo_constellations.update_one(query, constellation)
print("End.")
