"""
Graphic a constellation based on the information stored in the mongoDB
constellations collection. Output the result in a PNG file.
"""
# -----------------------------------------------------------------------------
# Standard library.
import os
import sys
import json
import math
import time
# Project modules.
from mods.cartesian import Cartesian
# 3rd party modules.
import numpy as np
import pymongo
from termcolor import colored
from PIL import Image, ImageDraw
# -----------------------------------------------------------------------------
start_time = time.time()
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
# Query for the desired constellation document
query = {"abbreviation_iau": "Ser"}
constellation_document = mongo_constellations.find_one(query)
# Iterate all boundaries, append into the boundaries list and find
# maximum and minimum boundaries.
boundaries_list = []
boundaries_list_len = len(constellation_document["boundaries_j2000"])
boundarie_min_dec = 90
boundarie_max_dec = -90
boundarie_min_ra = 360
boundarie_max_ra = 0
for boundarie in constellation_document["boundaries_j2000"]:
    boundaries_list.append((
        boundarie["ra"],
        boundarie["dec"]
    ))
    if (boundarie_min_dec > boundarie["dec"]):
        boundarie_min_dec = boundarie["dec"]
    if (boundarie_max_dec < boundarie["dec"]):
        boundarie_max_dec = boundarie["dec"]
    if (boundarie_min_ra > boundarie["ra"]):
        boundarie_min_ra = boundarie["ra"]
    if (boundarie_max_ra < boundarie["ra"]):
        boundarie_max_ra = boundarie["ra"]
# -----------------------------------------------------------------------------
# Configurable parameters.
# Sphere radius.
radius = 200
# RA center in degrees.
ra_center = (boundarie_min_ra +
             ((boundarie_max_ra - boundarie_min_ra) / 2)) * -1
ra_center = 0
# Dec center in degrees
dec_center = (boundarie_min_dec +
              ((boundarie_max_dec - boundarie_min_dec) / 2)) * -1
dec_center = -45
# Image geometry.
image_width = 800
image_height = 800
# Field of view.
fov = 90
# Steps angle for RA in degrees.
steps_ra = 10
# Steps angle Dec in degrees.
steps_dec = 10
# Precission on the boundaries list.
boundaries_chunks = 5
# Colors
color_background = (3, 7, 11)
color_ra_dec = (213, 51, 67)
color_boundaries = (0, 119, 247)
color_constellation_lines = (247, 187, 7)
# -----------------------------------------------------------------------------
cartesian = Cartesian(dec_center, ra_center, radius, fov, "deg")
# -----------------------------------------------------------------------------
# Convert steps to radians
steps_ra_rad = math.radians(steps_ra)
steps_dec_rad = math.radians(steps_dec)
# -----------------------------------------------------------------------------
# Compute offset.
offset = (image_width / 2, image_height / 2)
# -----------------------------------------------------------------------------
# Constants
pi_times_2 = (math.pi * 2)
pi_by_2 = (math.pi / 2)
# -----------------------------------------------------------------------------
# Create image.
image = Image.new("RGB", (image_width, image_height), color=color_background)
image_draw = ImageDraw.Draw(image)
# -----------------------------------------------------------------------------
# Compute RA/Dec lines.
sphere_matrix = []
for ra_rad in np.arange(0, pi_times_2 + steps_ra_rad, steps_ra_rad):
    sphere_matrix_row = []
    for dec_rad in np.arange(0, math.pi + steps_dec_rad, steps_dec_rad):
        sphere_matrix_row.append(
            cartesian.from_ra_dec_to_rad(ra_rad, dec_rad, "rad")
        )
    sphere_matrix.append(sphere_matrix_row)
# -----------------------------------------------------------------------------
# Determine the number of cols and rows of the sphere matrix
sphere_matrix_rows = len(sphere_matrix)
sphere_matrix_cols = len(sphere_matrix[0])
# -----------------------------------------------------------------------------
# Draw previously computed RA/Dec lines
for x in range(0, sphere_matrix_rows):
    for y in range(0, sphere_matrix_cols):
        x_plus_1 = x + 1
        y_plus_1 = y + 1
        point_from = (
            sphere_matrix[x][y][0] + offset[0],
            sphere_matrix[x][y][1] + offset[1]
        )
        if (x_plus_1 < sphere_matrix_rows) and \
                (y_plus_1 < sphere_matrix_cols):
            point_to_1 = (
                sphere_matrix[x_plus_1][y][0] + offset[0],
                sphere_matrix[x_plus_1][y][1] + offset[1]
            )
            point_to_2 = (
                sphere_matrix[x][y_plus_1][0] + offset[0],
                sphere_matrix[x][y_plus_1][1] + offset[1]
            )
            if (sphere_matrix[x][y][2] <= 0) or \
                    (sphere_matrix[x_plus_1][y][2] <= 0):
                image_draw.line((point_from, point_to_1), color_ra_dec)
            if (sphere_matrix[x][y][2] <= 0) or \
                    (sphere_matrix[x][y_plus_1][2] <= 0):
                image_draw.line((point_from, point_to_2), color_ra_dec)

# -----------------------------------------------------------------------------
# Interpolate boundarie lines to make them follow the sphere curvature.
interpolated_boundaries_list = []
for i in range(0, len(boundaries_list)):
    i_plus_1 = i + 1
    if (i_plus_1 >= boundaries_list_len):
        i_plus_1 = 0
    ra_diff = boundaries_list[i_plus_1][0] - boundaries_list[i][0]
    if (ra_diff > 180):
        ra_diff = ra_diff - 360
    if (ra_diff < -180):
        ra_diff = ra_diff + 360
    dec_diff = boundaries_list[i_plus_1][1] - boundaries_list[i][1]
    chunks = boundaries_chunks
    if(ra_diff / 2 > chunks):
        chunks = int(ra_diff)
    if(dec_diff/2 > chunks):
        chunks = int(dec_diff)
    ra_chunk = ra_diff / chunks
    dec_chunk = dec_diff / chunks
    for j in range(1, chunks + 1):
        ra = boundaries_list[i][0] + (j * ra_chunk)
        if (ra < 0):
            ra += 360
        dec = boundaries_list[i][1] + (j * dec_chunk)
        interpolated_boundaries_list.append(
            (math.radians(ra), math.radians(dec)))
# Apply rotation and camera matrices to boundaries.
interpolated_boundaries_list_len = len(interpolated_boundaries_list)
for i in range(0, interpolated_boundaries_list_len):
    point = rotate_camera(
        cartesian_phi(
            cartesian_theta(interpolated_boundaries_list[i][1]),
            interpolated_boundaries_list[i][0]))
    interpolated_boundaries_list[i] = (
        point[0] + offset[0], point[1] + offset[1])
# Draw the boundaries
image_draw.polygon(interpolated_boundaries_list,
                   fill=None, outline=color_boundaries)
# -----------------------------------------------------------------------------
# Draw constellation lines
for line in constellation_document["lines_j2000"]:
    line_from_to = [
        [math.radians(line["from"]["ra"]),
         math.radians(line["from"]["dec"])],
        [math.radians(line["to"]["ra"]),
         math.radians(line["to"]["dec"])]
    ]
    for i in range(0, 2):
        point = rotate_camera(
            cartesian_phi(
                cartesian_theta(
                    line_from_to[i][1]), line_from_to[i][0]))
        line_from_to[i] = (point[0] + offset[0], point[1] + offset[1])
    # Draw the boundaries
    image_draw.line(tuple(line_from_to), color_constellation_lines)
# -----------------------------------------------------------------------------
# Save the image output.
image.save("./tmp/graph_contellation.png")
# -----------------------------------------------------------------------------
print(f"Execution: {time.time() - start_time} seconds")
# -----------------------------------------------------------------------------
