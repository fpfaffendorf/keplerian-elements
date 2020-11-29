# Status: Demo
# Notes: Improvements pending.

"""
Determine constellations limits.
"""

import json
import math
import pymongo
from urllib import request
from PIL import Image, ImageDraw
import numpy as np
from mods.rotate import Rotate

# Create image.
image_width = 800
image_height = 800
offset_width = image_width / 2
offset_height = image_height / 2
image = Image.new("RGB", (image_width, image_height), color=(0, 0, 0))
image_draw = ImageDraw.Draw(image)

# Setup rotation matrices and camera
radius = min(offset_width, offset_height)
angle_x = 90
angle_y = 0
angle_z = 0
fov = 90
rotate = Rotate(angle_x, angle_y, angle_z, fov, radius)

# Draw sphere
steps_ra_rad = .1
steps_dec_rad = .1
for ra_rad in np.arange(0, math.pi * 2 + steps_ra_rad, steps_ra_rad):
    for dec_rad in np.arange(0, math.pi * 2 + steps_dec_rad, steps_dec_rad):
        # To cartesian
        vertice = [
            math.cos(ra_rad) * math.cos(dec_rad),
            math.sin(ra_rad) * math.cos(dec_rad),
            math.sin(dec_rad)
        ]
        # Rotate vertice
        vertice = rotate.rotate(vertice[0], vertice[1], vertice[2])
        # Draw point
        image_draw.point(
            (vertice[0] + offset_width, vertice[1] + offset_height),
            (255, 255, 255)
        )

# Save the image output.
image.save("./out/sphere_draw.png")

# Finish script
print("End.")
