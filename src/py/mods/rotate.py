# Status: SEALED

"""
Cartesian rotation and camera functions.
"""

import math


class Rotate:

    __angle_x = 0
    __angle_y = 0
    __angle_z = 0
    __fov = 0
    __radius_px = 0

    __angle_x_rad = 0
    __angle_y_rad = 0
    __angle_z_rad = 0
    __fov_rad = 0

    __cos_angle_x_rad = 0
    __cos_angle_y_rad = 0
    __cos_angle_z_rad = 0

    __sin_angle_x_rad = 0
    __sin_angle_y_rad = 0
    __sin_angle_z_rad = 0

    __minus_sin_angle_x_rad = 0
    __minus_sin_angle_y_rad = 0
    __minus_sin_angle_z_rad = 0

    __fov_tan = 0

    def __init__(self, angle_x, angle_y, angle_z, fov, radius_px):
        """
        Initialize rotation and camera constants.
        """
        self.__angle_x = angle_x + 270
        self.__angle_y = angle_y
        self.__angle_z = angle_z + 270
        self.__fov = fov
        self.__radius_px = radius_px

        self.__angle_x_rad = math.radians(self.__angle_x)
        self.__angle_y_rad = math.radians(self.__angle_y)
        self.__angle_z_rad = math.radians(self.__angle_z)
        self.__fov_rad = math.radians(self.__fov)

        self.__cos_angle_x_rad = math.cos(self.__angle_x_rad)
        self.__cos_angle_y_rad = math.cos(self.__angle_y_rad)
        self.__cos_angle_z_rad = math.cos(self.__angle_z_rad)

        self.__sin_angle_x_rad = math.sin(self.__angle_x_rad)
        self.__sin_angle_y_rad = math.sin(self.__angle_y_rad)
        self.__sin_angle_z_rad = math.sin(self.__angle_z_rad)

        self.__minus_sin_angle_x_rad = -1 * (self.__sin_angle_x_rad)
        self.__minus_sin_angle_y_rad = -1 * (self.__sin_angle_y_rad)
        self.__minus_sin_angle_z_rad = -1 * (self.__sin_angle_z_rad)

        self.__fov_tan_rad = 1 / math.tan(self.__fov_rad / 2)

    def rotate(self, x, y, z):
        """
        Apply the rotation and camera matrices to the given cartesian point.
        """
        # Apply radius
        p = (
            x * self.__radius_px,
            y * self.__radius_px,
            z * self.__radius_px
        )
        # Rotate Z
        p = (
            p[0] * self.__cos_angle_z_rad +
            p[1] * self.__sin_angle_z_rad,
            p[0] * self.__minus_sin_angle_z_rad +
            p[1] * self.__cos_angle_z_rad,
            p[2]
        )
        # Rotate Y
        p = (
            p[0] * self.__cos_angle_y_rad +
            p[2] * self.__minus_sin_angle_y_rad,
            p[1],
            p[0] * self.__sin_angle_y_rad +
            p[2] * self.__cos_angle_y_rad
        )
        # Rotate X
        p = (
            p[0],
            p[1] * self.__cos_angle_x_rad +
            p[2] * self.__sin_angle_x_rad,
            p[1] * self.__minus_sin_angle_x_rad +
            p[2] * self.__cos_angle_x_rad
        )
        # Camera
        p = (
            p[0] * self.__fov_tan_rad,
            p[1] * self.__fov_tan_rad,
            p[2]
        )
        return p
