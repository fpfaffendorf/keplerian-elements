# Status: IN PROGRESS
# Notes: Improvements pending.
# TODO: Show RA/Dec numeration.

"""
Draw the sky according to requested parameters.
"""

import json
import math
import pymongo
from urllib import request
from PIL import Image, ImageDraw, ImageFont
from mods.rotate import Rotate
from mods.get_arg import GetArg
from mods.cartesian import Cartesian


def draw_cross(x, y, width, color):
    """
    Draw a cross at the given x, y with the given width and color.
    """
    image_draw.line(((x - width, y), (x + width, y)), color)
    image_draw.line(((x, y - width), (x, y + width)), color)


def draw_star(x, y, magnitude, color):
    """
    Draw a star at the given x, y coordinate.
    """
    # Convert magnitude to ellipse radius in px units
    # Full interpolation is not needed, that's why numpy is not used.
    magnitude_to_radius = (
        (-99, 10), (0, 8), (1, 6), (2, 5), (3, 4), (4, 2), (5, 1), (99, 1)
    )
    radius = 0
    for i in range(0, len(magnitude_to_radius)):
        if (magnitude >= magnitude_to_radius[i][0]) and \
                (magnitude < magnitude_to_radius[i+1][0]):
            radius = magnitude_to_radius[i][1]
            break
    image_draw.ellipse(
        (x - radius, y - radius, x + radius, y + radius),
        color
    )


# Configure the image geometry.
image_width = GetArg.get("width-px", 800, int)
image_height = GetArg.get("height-px", 800, int)
offset_width = image_width / 2
offset_height = image_height / 2

# Get config data.
print("Getting config data.")
config = None
with open("./etc/config.json", "r") as f:
    config = json.loads(f.read())

# Create image.
image = Image.new("RGB", (image_width, image_height),
                  GetArg.get("sky-color", (0, 0, 0), eval))
image_draw = ImageDraw.Draw(image)

# Establish a connection with remote mongoDB and get the constellations
# collection from the keplerianelements database.
print("Establishing a mongoDB connection.")
mongo_client = \
    pymongo.MongoClient(config["general"]["mongodb_connection_string"])
mongo_db = mongo_client["keplerianelements"]
mongo_constellations = mongo_db["constellations"]
mongo_catalogs = mongo_db["catalogs"]

# Center at the desired point in the sky
center_at = GetArg.get("center-at", "constellation", None)
if center_at == "constellation":
    print("Requesting the constellation from mongoDB.")
    constellation = GetArg.get("constellation", "Ori", None)
    # Get the desired constellation from mongoDB collection.
    document = mongo_constellations.find_one(
        {"abbreviation_iau": constellation},
        {
            "boundaries_j2000.limits.parts.centroid.equatorial.dec_deg": 1,
            "boundaries_j2000.limits.parts.centroid.equatorial.ra_deg": 1,
            "boundaries_j2000.limits.parts.centroid.cartesian": 1,
            "boundaries_j2000.limits.parts.angular_separation.deg": 1
        }
    )
    # Instantiate the Rotate class.
    parts = document["boundaries_j2000"]["limits"]["parts"]
    limits = parts[GetArg.get("constellation-part", 0, int)]
    radius = min(offset_width, offset_height)
    angle_x = limits["centroid"]["equatorial"]["dec_deg"]
    angle_z = limits["centroid"]["equatorial"]["ra_deg"]
    fov = limits["angular_separation"]["deg"]
    rotate = Rotate(angle_x, 0, angle_z, fov, radius)
    # Get the centroid and rotate it.
    vertice = limits["centroid"]["cartesian"]
    vertice = rotate.rotate(vertice["x"], vertice["y"], vertice["z"])
# Center the on the desired RA/Dec instead.
elif center_at == "free":
    radius = min(offset_width, offset_height)
    angle_x = GetArg.get("dec-center-deg", 0, eval)
    angle_z = GetArg.get("ra-center-deg", 0, eval)
    fov = GetArg.get("fov-deg", 45, eval)
    rotate = Rotate(angle_x, 0, angle_z, fov, radius)
    vertice = [0, 0]
# Draw the centroid cross.
show_centroid = GetArg.get("show-centroid", False,
                           GetArg.str_to_bool)
if show_centroid:
    draw_cross(vertice[0] + offset_width,
               vertice[1] + offset_height,
               5,
               GetArg.get("centroid-color", (255, 0, 255), eval))


# RA/Dec lines.
show_ra_dec_lines = GetArg.get("show-ra-dec-lines", False,
                               GetArg.str_to_bool)
if show_ra_dec_lines:
    # Compute RA/Dec lines.
    print("Computing RA/Dec lines.")
    sphere_matrix = []
    ra_spacing = GetArg.get("ra-grid-spacing-deg", 15, int)
    dec_spacing = GetArg.get("dec-grid-spacing-deg", 10, int)
    for ra in range(0, 360 + 1, 1):
        sphere_matrix_row = []
        for dec in range(-90, 90 + 1, 1):
            vertice = Cartesian.get(ra, dec)
            vertice = rotate.rotate(vertice[0], vertice[1], vertice[2])
            sphere_matrix_row.append(
                vertice
            )
        sphere_matrix.append(sphere_matrix_row)
    # Draw RA lines
    print("Drawing RA lines.")
    for y in range(0, len(sphere_matrix), ra_spacing):
        vertice_from = []
        vertice_to = None
        for x in range(0, len(sphere_matrix[0]), 1):
            if vertice_from != []:
                if sphere_matrix[y][x][2] >= 0:
                    image_draw.line(
                        (vertice_from[0] + offset_width,
                         vertice_from[1] + offset_height,
                         sphere_matrix[y][x][0] + offset_width,
                         sphere_matrix[y][x][1] + offset_height),
                        GetArg.get("ra-dec-lines-color", (60, 60, 60), eval)
                    )
            vertice_from = sphere_matrix[y][x]
    # Draw Dec lines
    print("Drawing Dec lines.")
    for x in range(0, len(sphere_matrix[0]), dec_spacing):
        vertice_from = []
        vertice_to = None
        for y in range(0, len(sphere_matrix), 1):
            if vertice_from != []:
                if sphere_matrix[y][x][2] >= 0:
                    image_draw.line(
                        (vertice_from[0] + offset_width,
                         vertice_from[1] + offset_height,
                         sphere_matrix[y][x][0] + offset_width,
                         sphere_matrix[y][x][1] + offset_height),
                        GetArg.get("ra-dec-lines-color", (60, 60, 60), eval)
                    )
            vertice_from = sphere_matrix[y][x]

# Draw constellations
show_lines = GetArg.get("show-constellations-line",
                        False, GetArg.str_to_bool)
show_boundaries = GetArg.get(
    "show-constellations-boundarie", False, GetArg.str_to_bool)
if show_lines or show_boundaries:
    print("Iterating constellations.")
    # Iterate all constalations.
    cursor = mongo_constellations.find(
        {},
        {
            "boundaries_j2000.limits.parts.centroid.cartesian": 1,
            "boundaries_j2000.interpolated.parts.vertices.coordinates.cartesian": 1,
            "lines_j2000.from.coordinates.cartesian": 1,
            "lines_j2000.to.coordinates.cartesian": 1
        }
    )
    for document in cursor:
        # Iterate parts.
        interpolated_parts = document["boundaries_j2000"]["interpolated"]["parts"]
        for part_index in range(0, len(interpolated_parts)):
            # Get the centroid to determine the z axis.
            limits_parts = document["boundaries_j2000"]["limits"]["parts"]
            vertice = limits_parts[part_index]["centroid"]["cartesian"]
            # Rotate vertice.
            vertice = rotate.rotate(vertice["x"], vertice["y"], vertice["z"])
            # Draw constellation only if centroid z axis is positive.
            if (vertice[2] > 0):
                if show_boundaries:
                    # Draw the boundaries.
                    polygon = []
                    vertices = interpolated_parts[part_index]["vertices"]
                    for vertice_index in range(0, len(vertices)):
                        # Get the vertices to render.
                        vertice = vertices[vertice_index]["coordinates"]["cartesian"]
                        # Rotate vertice.
                        vertice = rotate.rotate(
                            vertice["x"], vertice["y"], vertice["z"])
                        polygon.append((vertice[0] + offset_width,
                                        vertice[1] + offset_height))
                    # Draw polygon.
                    image_draw.polygon(
                        polygon,
                        None,
                        GetArg.get("constellation-boundaries-color",
                                   (255, 0, 0), eval)
                    )
                if show_lines:
                    # Draw constellation lines.
                    for line in document["lines_j2000"]:
                        # Get the vertices to draw.
                        vertice_from = line["from"]["coordinates"]["cartesian"]
                        vertice_to = line["to"]["coordinates"]["cartesian"]
                        # Rotate vertice.
                        vertice_from = rotate.rotate(
                            vertice_from["x"], vertice_from["y"], vertice_from["z"])
                        vertice_to = rotate.rotate(
                            vertice_to["x"], vertice_to["y"], vertice_to["z"])
                        # Draw line.
                        image_draw.line(
                            (vertice_from[0] + offset_width,
                             vertice_from[1] + offset_height,
                             vertice_to[0] + offset_width,
                             vertice_to[1] + offset_height),
                            GetArg.get("constellation-lines-color",
                                       (255, 255, 255), eval),
                            1
                        )

# Iterate all stars.
print("Iterating stars.")
show_stars_greek = GetArg.get("show-stars-greek", False, GetArg.str_to_bool)
show_stars_name = GetArg.get("show-stars-name", False, GetArg.str_to_bool)
projection = {
    "stars.coordinates.cartesian": 1,
    "stars.color.rgb": 1,
    "stars.magnitude": 1,
}
if show_stars_greek:
    projection["stars.greek"] = 1
if show_stars_name:
    projection["stars.name"] = 1
stars_color = GetArg.get("stars-color", "real", None)
color_rgb = (0, 0, 0)
if stars_color != "real":
    color_rgb = eval(stars_color)
catalog = mongo_catalogs.find_one({"catalog": "hipparcos_6"}, projection)
for star in catalog["stars"]:
    cartesian = star["coordinates"]["cartesian"]
    vector = rotate.rotate(cartesian["x"], cartesian["y"], cartesian["z"])
    if (vector[2] >= 0):
        if stars_color == "real":
            color_rgb = tuple(star["color"]["rgb"])
        draw_star(vector[0] + offset_width, vector[1] +
                  offset_height, star["magnitude"],
                  color_rgb)
        if show_stars_greek:
            greek = ""
            if "greek" in star:
                greek = star["greek"]
            image_draw.text(
                (vector[0] + offset_width + 3, vector[1] + offset_height + 3),
                greek,
                font=ImageFont.truetype(
                    "./ttf/Unifont/unifont-13.0.03.ttf", 12),
                fill=(255, 255, 255))
        if show_stars_name:
            name = ""
            if "name" in star:
                name = star["name"]
            image_draw.text(
                (vector[0] + offset_width + 3, vector[1] + offset_height + 15),
                name,
                font=ImageFont.truetype(
                    "./ttf/Raleway/Raleway-Regular.ttf", 14),
                fill=(255, 255, 255))


# Iterate all constalation names.
show_constellations_name = GetArg.get("show-constellations-name", False,
                                      GetArg.str_to_bool)
if show_constellations_name:
    print("Iterating constellation names.")
    cursor = mongo_constellations.find(
        {},
        {
            "name": 1,
            "boundaries_j2000.limits.parts.centroid.cartesian": 1
        }
    )
    for document in cursor:
        parts = document["boundaries_j2000"]["limits"]["parts"]
        for part_index in range(0, len(interpolated_parts)):
            limits = parts[part_index]
            # Get the centroid and rotate it.
            vector = limits["centroid"]["cartesian"]
            vector = rotate.rotate(vector["x"], vector["y"], vector["z"])
            if vector[2] >= 0:
                image_draw.text(
                    (vector[0] + offset_width, vector[1] + offset_height),
                    document["name"],
                    font=ImageFont.truetype(
                        "./ttf/Raleway/Raleway-Regular.ttf", 20),
                    fill=(255, 255, 255))

# Save the image output.
image.save("./out/constellations_draw.png")

# Finish script
print("End.")
