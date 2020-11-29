# Status: SEALED

"""
Interpolate the official constellations boundaries to improve the 
curvature when applied to a spherical projection.
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
# Iterate constellations
for document in cursor:
    print(f'Processing {document["abbreviation_iau"]}.')
    # Prepare boundaries list
    boundaries_j2000 = {
        "parts": []
    }
    parts = document["boundaries_j2000"]["iau"]["parts"]
    # Iterate parts
    for part_index in range(0, len(parts)):
        boundaries_j2000["parts"].append({
            "vertices": []
        })
        polygon = []
        vertices = parts[part_index]["vertices"]
        # Iterate vertices in each part
        for vertice_index in range(0, len(vertices)):
            # Get the vertice's coordinate object
            coordinate = vertices[vertice_index]["coordinates"]
            # Fill the polygon list with boundaries
            polygon.append(coordinate)

        # Iterate through the polygon list and interpolate boundaries
        for i in range(0, len(polygon)):
            # Determine the next vertice's index
            i_plus_1 = i + 1
            if (i_plus_1 >= len(polygon)):
                i_plus_1 = 0
            # Compute the RA/Dec difference between the current and next
            # vertice
            ra_diff = polygon[i_plus_1]["equatorial"]["ra_deg"] - \
                polygon[i]["equatorial"]["ra_deg"]
            if (ra_diff > 180):
                ra_diff = ra_diff - 360
            if (ra_diff < -180):
                ra_diff = ra_diff + 360
            dec_diff = polygon[i_plus_1]["equatorial"]["dec_deg"] - \
                polygon[i]["equatorial"]["dec_deg"]
            # Append initial vertice
            boundaries_j2000["parts"][part_index]["vertices"].append({
                "coordinates": polygon[i]
            })
            # Determine chunks number
            chunks = max(int(abs(ra_diff)), int(abs(dec_diff)))
            # If it deserves interpolation proceed
            if (chunks > 0):
                ra_chunk = ra_diff / chunks
                dec_chunk = dec_diff / chunks
                for j in range(1, chunks):
                    ra = polygon[i]["equatorial"]["ra_deg"] + (j * ra_chunk)
                    if (ra < 0):
                        ra += 360
                    dec = polygon[i]["equatorial"]["dec_deg"] + (j * dec_chunk)
                    boundaries_j2000["parts"][part_index]["vertices"].append({
                        "coordinates": CoordinatesDocument.get(ra, dec)
                    })

    # Prepare the update query.
    query = {
        "abbreviation_iau": document["abbreviation_iau"]
    }
    # Document update.
    constellation = {
        "$set": {
            "boundaries_j2000.interpolated": boundaries_j2000
        }
    }
    # Update the constellation document with new information.
    print(f'Updating constellation {document["abbreviation_iau"]}.')
    mongo_constellations.update_one(query, constellation)
print("End.")
