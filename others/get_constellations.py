"""
Get each constellation abbreviation, name and lines coordinates from
Stellarium github repository. Get the constellations boundaries from the
IAU web site, convert all the information to json documents and upload
the data to a remote mongodb collection.
"""
# -----------------------------------------------------------------------------
# Standard library.
import os
import sys
import json
import re
import math
from urllib import request
# 3rd party modules.
import pymongo
from termcolor import colored
from astroquery.gaia import Gaia
# -----------------------------------------------------------------------------
__author__ = "Federico Pfaffendorf"
__copyright__ = "Copyright 2020, keplerianelements.com"
__license__ = "GNU General Public License v3.0"
__version__ = "1.0.0"
__email__ = "yo@federicopfaffendorf.com.ar"
# -----------------------------------------------------------------------------
# Set ANSI escape color on Windows systems.
if (os.name == "nt"):
    os.system("color")
# -----------------------------------------------------------------------------
# Load configuration file.
config = ""
with open("./etc/config.json", "r") as f:
    config = json.loads(f.read())
# -----------------------------------------------------------------------------
# Establish a connection with remote mongoDB and get the constellations
# collection from the keplerianelements database.
mongo_client = \
    pymongo.MongoClient(config["general"]["mongodb_connection_string"])
mongo_db = mongo_client["keplerianelements"]
mongo_constellations = mongo_db["constellations"]
# -----------------------------------------------------------------------------
# Request constellation names from the Stellarium github repository.
with request.urlopen(config["constellations"]["stellarium_names"]) as r:
    stellarium_names = r.read().decode("utf-8").splitlines()
# -----------------------------------------------------------------------------
# Request constellation lines from the Stellarium github repository.
with request.urlopen(config["constellations"]["stellarium_lines"]) as r:
    stellarium_lines = r.read().decode("utf-8").splitlines()
# -----------------------------------------------------------------------------
# Check command line arguments and show the help.
if(len(sys.argv) != 2):
    print(colored("Please specify a constellation.", "red"))
    print("Usage: ")
    print("    python getconstellations.py <abbreviation_iau>")
    print("    python getconstellations.py all")
    print()
    sys.exit(0)
# -----------------------------------------------------------------------------
# Iterate all Stellarium constellations.
for stellarium_names_index, stellarium_names_line in \
        enumerate(stellarium_names, start=1):
    stellarium_names_line_data = re.split(r"\t+",
                                          stellarium_names_line.strip())
    argv_constellation = str(sys.argv[1]).lower()
    if ((argv_constellation == stellarium_names_line_data[0].lower()) or
            (argv_constellation == "all")):
        # Initialize lines and boundaries array
        lines_j2000 = []
        boundaries_j2000 = []
        # Print in console the current constellation being processed.
        print(colored(
            f"Constellation " +
            f"({stellarium_names_index}/{len(stellarium_names)}): " +
            f"{stellarium_names_line_data[0]}", "green"), end="\r")
        # Iterate constellation lines coordinates in Stellarium file.
        # Request the J2000 RA and DEC from Gaia Hipparcos ADQL
        # database.
        for stellarium_lines_line in stellarium_lines:
            stellarium_lines_line_data = \
                re.split(r" +", stellarium_lines_line.strip())
            if (stellarium_lines_line_data[0] ==
                    stellarium_names_line_data[0]):
                for i in range(2, len(stellarium_lines_line_data), 2):
                    gaia_job = Gaia.launch_job(
                        "SELECT TOP 2 hip, " +
                        "COORD1(EPOCH_PROP_POS(ra, dec, plx, " +
                        " pm_ra, pm_de, 0, 1991.25, 2000)) as ra, " +
                        "COORD2(EPOCH_PROP_POS(ra, dec, plx, " +
                        "pm_ra, pm_de, 0, 1991.25, 2000)) as dec " +
                        "FROM public.hipparcos_newreduction " +
                        f"WHERE hip = {stellarium_lines_line_data[i]} " +
                        f"OR hip = {stellarium_lines_line_data[i+1]} " +
                        "ORDER BY hip")
                    gaia_results = gaia_job.get_results()
                    lines_j2000.append({
                        "from": {
                            "hipparcos_id":
                                int(gaia_results.columns["hip"][0]),
                            "ra_deg": gaia_results.columns["ra"][0],
                            "dec_deg": gaia_results.columns["dec"][0]
                        },
                        "to": {
                            "hipparcos_id":
                                int(gaia_results.columns["hip"][1]),
                            "ra_deg": gaia_results.columns["ra"][1],
                            "dec_deg": gaia_results.columns["dec"][1]
                        }
                    })
        # Request constellations boundaries from IAU web site.
        # The Serpens constellation is splitted in two due to its
        # natureon. That's why this workaround is needed.
        request_IAU_constellation_parts = [1]
        if (stellarium_names_line_data[0].lower() == "ser"):
            request_IAU_constellation_parts.append(2)
        for request_IAU_constellation_part in request_IAU_constellation_parts:
            if (len(request_IAU_constellation_parts) == 1):
                request_IAU_constellation_part_aux = ""
            else:
                request_IAU_constellation_part_aux = \
                    str(request_IAU_constellation_part)
            with request.urlopen(
                    config["constellations"]["iau_boundaries_url"] +
                    stellarium_names_line_data[0].lower() +
                    request_IAU_constellation_part_aux +
                    ".txt") as request_IAU:
                file_IAU = request_IAU.read().decode("utf-8")
                for line_IAU in file_IAU.splitlines():
                    line_IAU = line_IAU.strip()
                    # Determine RA and DEC both in degree only if line
                    # is well formated
                    if ((len(line_IAU) >= 29) and (len(line_IAU) <= 30)):
                        boundaries_j2000.append({
                            "part": request_IAU_constellation_part,
                            "ra_deg": (float(line_IAU[0:2]) * 15) +
                            (float(line_IAU[3:5]) * 15 / 60) +
                            (float(line_IAU[6:13]) * 15 / 3600),
                            "dec_deg": float(line_IAU[14:25])
                        })
        # Prepare the "upsert" query.
        query = {
            "abbreviation_iau": stellarium_names_line_data[0]
        }
        # Prepare the constellation document to insert on the mongoDB
        # collection.
        constellation = {
            "abbreviation_iau": stellarium_names_line_data[0],
            "name": stellarium_names_line_data[1].replace('"', ""),
            "lines_j2000": lines_j2000,
            "boundaries_j2000": boundaries_j2000
        }
        # Insert or update ("upsert") the document.
        mongo_constellations.replace_one(query, constellation, upsert=True)
print()
sys.exit(0)
# -----------------------------------------------------------------------------
