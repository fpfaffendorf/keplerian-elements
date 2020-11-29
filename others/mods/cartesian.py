"""
High speed optimized to-cartesian system conversion.
"""
# -----------------------------------------------------------------------------
# Standard library.
import math
import numpy as np
# -----------------------------------------------------------------------------
__author__ = "Federico Pfaffendorf"
__copyright__ = "Copyright 2020, keplerianelements.com"
__license__ = "GNU General Public License v3.0"
__version__ = "1.0.0"
__email__ = "yo@federicopfaffendorf.com.ar"
# -----------------------------------------------------------------------------


class Cartesian:

    # Input parameters
    __theta = 0
    __phi = 0
    __radius = 0
    __fov = 0
    __units = "deg"

    # Constants
    __pi_times_2 = (math.pi * 2)
    __pi_by_2 = (math.pi / 2)
    __theta_rad = 0
    __phi_rad = 0
    __fov_rad = 0

    # Rotation constants
    __rot_x_11_22 = 0
    __rot_x_12 = 0
    __rot_x_21 = 0
    __rot_y_00_22 = 0
    __rot_y_20 = 0
    __rot_y_02 = 0
    __cam_00_11 = 0

    # Conversion cache
    __last_ra_rad = 9999
    __ra_cart_cache = 0

    def __init__(self, theta, phi, radius, fov, units):
        self.__theta = theta
        self.__phi = phi
        self.__radius = radius
        self.__fov = fov
        self.__units = units
        # Clear conversion cache.
        self.__last_ra_rad = 9999
        self.__ra_cart_cache = 0
        # Process constants.
        self.__constants()

    def __constants(self):
        # Convert angles to RAD.
        if (self.__units == "deg"):
            self.__theta_rad = math.radians(self.__theta)
            self.__phi_rad = math.radians(self.__phi)
            self.__fov_rad = math.radians(self.__fov)
        else:
            self.__theta_rad = self.__theta
            self.__phi_rad = self.__phi
            self.__fov_rad = self.__fov
        # X rotation matrix.
        self.__rot_x_11_22 = math.cos(self.__theta_rad)
        self.__rot_x_12 = math.sin(self.__theta_rad)
        self.__rot_x_21 = self.__rot_x_12 * -1
        # Y rotation matrix.
        self.__rot_y_00_22 = math.cos(self.__phi_rad)
        self.__rot_y_20 = math.sin(self.__phi_rad)
        self.__rot_y_02 = self.__rot_y_20 * -1
        # Camera matrix.
        self.__cam_00_11 = 1 / math.tan(self.__fov_rad / 2)

    def from_ra_dec_to_rad(self, ra, dec, units):
        # Convert units to RAD
        if (units == "deg"):
            ra_rad = math.radians(ra)
            dec_rad = math.radians(dec)
        else:
            ra_rad = ra
            dec_rad = dec
        # If same RA as before use cache, otherwise compute RA to Cartesian
        # conversion.
        if (ra_rad != self.__last_ra_rad):
            self.__last_ra_rad = ra_rad
            ra_rad += self.__pi_by_2
            radius_times_sin_ra_rad = self.__radius * math.sin(ra_rad)
            self.__ra_cart_cache = [
                radius_times_sin_ra_rad,
                self.__radius * math.cos(ra_rad),
                radius_times_sin_ra_rad * -1
            ]
        # Compute Dec to Cartesian conversion.
        dec_rad += self.__pi_by_2
        p = [
            self.__ra_cart_cache[0] * math.cos(dec_rad),
            self.__ra_cart_cache[1],
            self.__ra_cart_cache[2] * math.sin(dec_rad)
        ]
        # Rotate Cartesian coordinates.
        # Rotate Y axis
        if (self.__phi != 0):
            p = [
                p[0] * self.__rot_y_00_22 + p[2] * self.__rot_y_20,
                p[1],
                p[0] * self.__rot_y_02 + p[2] * self.__rot_y_00_22
            ]
        # Rotate X axis
        if (self.__theta != 0):
            p = [
                p[0],
                p[1] * self.__rot_x_11_22 + p[2] * self.__rot_x_12,
                p[1] * self.__rot_x_21 + p[2] * self.__rot_x_11_22
            ]
        # Camera
        p = [p[0] * self.__cam_00_11, p[1] * self.__cam_00_11, p[2]]
        return p
