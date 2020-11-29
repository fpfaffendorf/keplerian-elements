# Status: SEALED

"""
Get stars from the Gaia (Hipparcos) database and upsert them in the
mongoDB collection.
"""

import json
import pymongo
import math
import numpy as np
from astroquery.gaia import Gaia
from mods.coordinates_document import CoordinatesDocument


def b_minus_v_2_K(b_v):
    """
    Convert from B-V to Kelvin degrees according to: 
    https://owd.tcnj.edu/~pfeiffer/PHY466/PHY466Chp1B.pdf
    """
    xp = [-.3, -.15, 0, 0.5, 1, 1.52]
    fp = [33000, 14800, 9600, 6500, 4800, 3600]
    return np.interp(b_v, xp, fp)


def k_2_rgb(k):
    """
    Convert from Kelvin to RGB.
    """
    temp = k / 100
    rgb = [0, 0, 0]
    if temp <= 66:
        rgb[0] = 255
        rgb[1] = 99.4708025861 * math.log(temp) - 161.1195681661
        if temp <= 19:
            rgb[2] = 0
        else:
            rgb[2] = 138.5177312231 * math.log(temp - 10) - 305.0447927307
    else:
        rgb[0] = 329.698727446 * math.pow(temp - 60, -0.1332047592)
        rgb[1] = 288.1221695283 * math.pow(temp - 60, -0.0755148492)
        rgb[2] = 255
    return (
        int(np.clip(rgb[0], 0, 255)),
        int(np.clip(rgb[1], 0, 255)),
        int(np.clip(rgb[2], 0, 255)),
    )


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

# Prepare the stars list.
stars = []

# Get RA/Dec J2000 and magnitude information from the Gaia (Hipparcos)
# ADQL service.
print(f"Gaia query.")
job = Gaia.launch_job_async(
    "SELECT hip, " +
    "COORD1(EPOCH_PROP_POS(ra, dec, plx, " +
    " pm_ra, pm_de, 0, 1991.25, 2000)) as ra, " +
    "COORD2(EPOCH_PROP_POS(ra, dec, plx, " +
    "pm_ra, pm_de, 0, 1991.25, 2000)) as dec, " +
    "hp_mag, b_v " +
    "FROM public.hipparcos_newreduction " +
    f'WHERE hp_mag <= 6 ' +
    "ORDER BY hip ")

# Get Gaia Results.
results = job.get_results()
for index, result in enumerate(results, start=1):
    print(f'Adding star {result["hip"]} ({index}/{len(results)}).')
    kelvin = b_minus_v_2_K(result["b_v"])
    rgb = k_2_rgb(kelvin)
    stars.append(
        {
            "id": int(result["hip"]),
            "coordinates": CoordinatesDocument.get(
                result["ra"], result["dec"]),
            "magnitude": result["hp_mag"],
            "color": {
                "b-v": result["b_v"],
                "kelvin": kelvin,
                "rgb": rgb
            }
        }
    )

# Prepare the upsert query.
query = {
    "catalog": "hipparcos_6"
}

# Prepare the document.
document = {
    "$set": {
        "catalog": "hipparcos_6",
        "epoch": "2000",
        "magnitude_limit": 6,
        "stars": stars
    }
}

# Insert or update ("upsert") the document.
print("Upserting the catalog.")
mongo_catalogs.update_one(query, document, upsert=True)

print("End.")
