# Status: SEALED

"""
Get constellations lines merging Stellarium and Gaia (Hipparcos) 
database.
"""

import json
import math
import pymongo
import re   # Regular expressions.
from urllib import request
from astroquery.gaia import Gaia
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

# Request constellation lines from the Stellarium github repository.
print("Request data from Stellarium github repository.")
with request.urlopen(config["constellations"]["stellarium_lines"]) as r:
    lines = r.read().decode("utf-8").splitlines()
    # Iterate each line in the file.
    for line in lines:
        # Prepare the lines list.
        lines_j2000 = []
        # Parse data.
        data = re.split(r" +", line.strip())
        if (len(data) >= 2):
            print(f"Gaia query for constellation {data[0]}, {data[1]} pairs.")
            for i in range(2, len(data), 2):
                # Get RA/Dec J2000 information from the Gaia (Hipparcos) ADQL
                # service.
                print(f"Gaia query for Hipparcos {data[i]} and {data[i+1]}.")
                gaia_job = Gaia.launch_job(
                    "SELECT TOP 2 hip, " +
                    "COORD1(EPOCH_PROP_POS(ra, dec, plx, " +
                    " pm_ra, pm_de, 0, 1991.25, 2000)) as ra, " +
                    "COORD2(EPOCH_PROP_POS(ra, dec, plx, " +
                    "pm_ra, pm_de, 0, 1991.25, 2000)) as dec " +
                    "FROM public.hipparcos_newreduction " +
                    f"WHERE hip = {data[i]} " +
                    f"OR hip = {data[i+1]} " +
                    "ORDER BY hip")
                # Get Gaia Results.
                gaia_results = gaia_job.get_results()
                # Append this constellation line.
                lines_j2000.append({
                    "from": {
                        "hipparcos_id":
                            int(gaia_results.columns["hip"][0]),
                        "coordinates":
                            CoordinatesDocument.get(
                                gaia_results.columns["ra"][0],
                                gaia_results.columns["dec"][0])
                    },
                    "to": {
                        "hipparcos_id":
                            int(gaia_results.columns["hip"][1]),
                        "coordinates":
                            CoordinatesDocument.get(
                                gaia_results.columns["ra"][1],
                                gaia_results.columns["dec"][1])
                    }
                })
            # Prepare the update query.
            query = {
                "abbreviation_iau": data[0]
            }
            # Document update
            constellation = {
                "$set": {
                    "lines_j2000": lines_j2000
                }
            }
            # Update the constellation document with new information.
            print(f"Updating constellation {data[0]}.")
            mongo_constellations.update_one(query, constellation)
print("End.")
