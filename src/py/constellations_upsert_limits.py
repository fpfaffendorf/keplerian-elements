# Status: IN PROGRESS
# Notes: Improvements pending.

# BUG: Issues rendering Oct constellation, declination must take into account
# RA.

"""
Determine constellations limits.
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
    parts = document["boundaries_j2000"]["iau"]["parts"]
    limits_parts = []
    # Iterate parts
    for part_index in range(0, len(parts)):
        polygon = []
        vertices = parts[part_index]["vertices"]
        # Iterate vertices
        for vertice in vertices:
            # Get the vertice's coordinates
            polygon.append(vertice["coordinates"])

        # Find the most distant points taking only RA into account and
        # reducing Dec to 0 degree.
        max_distance = 0
        max_distance_vertice_from = None
        max_distance_vertice_to = None
        vertice_from_i = 0
        vertice_to_i = 0
        # Cartisian product between with the polygon list.
        # TODO: This could be improved to avoid iterating twice the
        # same points.
        for vertice_from in polygon:
            vertice_coordinate_from = vertice_from
            vertice_from = vertice_from["equatorial"]["ra_rad"]
            for vertice_to in polygon:
                vertice_coordinate_to = vertice_to
                vertice_to = vertice_to["equatorial"]["ra_rad"]
                # Meeus Astronomical Algorithms (Chapter 17)
                distance = math.acos(
                    math.cos(vertice_to - vertice_from))
                # If a larger distance has been found record the
                # from/to vertices
                if (distance > max_distance):
                    max_distance_vertice_from = vertice_coordinate_from
                    max_distance_vertice_to = vertice_coordinate_to
                    max_distance = distance
        max_ra = max_distance_vertice_to["equatorial"]["ra_deg"]
        min_ra = max_distance_vertice_from["equatorial"]["ra_deg"]

        # Find the max and min Dec.
        max_dec = -90
        min_dec = 90
        for vertice in polygon:
            min_dec = min(min_dec, vertice["equatorial"]["dec_deg"])
            max_dec = max(max_dec, vertice["equatorial"]["dec_deg"])

        # Find the angular separation between the two points
        max_ra_rad = math.radians(max_ra)
        min_ra_rad = math.radians(min_ra)
        max_dec_rad = math.radians(max_dec)
        min_dec_rad = math.radians(min_dec)
        angular_separation_rad = math.acos(
            math.sin(max_dec_rad) * math.sin(min_dec_rad) +
            math.cos(max_dec_rad) * math.cos(min_dec_rad) *
            math.cos(max_ra_rad - min_ra_rad)
        )

        # Find the centroid
        centroid_ra_rad = (max_ra_rad + min_ra_rad)
        centroid_ra_rad /= 2
        centroid_angular_separation_1 = math.acos(
            math.cos(max_ra_rad - centroid_ra_rad)
        )
        centroid_angular_separation_2 = math.acos(
            math.cos(max_ra_rad - centroid_ra_rad + math.pi)
        )
        if (centroid_angular_separation_2 < centroid_angular_separation_1):
            centroid_ra_rad += math.pi
        centroid_ra = math.degrees(centroid_ra_rad)
        centroid_dec = (max_dec + min_dec) / 2

        # Append the constellation parts
        limits_parts.append(
            {
                "points": [
                    CoordinatesDocument.get(max_ra, max_dec),
                    CoordinatesDocument.get(min_ra, min_dec)
                ],
                "angular_separation": {
                    "deg": math.degrees(angular_separation_rad),
                    "rad": angular_separation_rad
                },
                "centroid": CoordinatesDocument.get(centroid_ra, centroid_dec)
            }
        )

    # Update the boundaries collection inserting a new key with the
    # constellation limits
    query = {
        "abbreviation_iau": document["abbreviation_iau"]
    }
    # Document update.
    constellation = {
        "$set": {
            f"boundaries_j2000.limits.parts": limits_parts
        }
    }
    # Update the constellation document with new information.
    print(f'Updating constellation {document["abbreviation_iau"]}.')
    mongo_constellations.update_one(query, constellation)

# Finish script
print("End.")
