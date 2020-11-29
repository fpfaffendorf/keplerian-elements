# Status: SEALED

"""
Cartesian rotation and camera functions.
"""

import math


class CoordinatesDocument:

    @staticmethod
    def get(ra_deg, dec_deg):
        """
        Resolve coordinate object based on the RA and Dec in degrees
        """
        ra_rad = math.radians(ra_deg)
        dec_rad = math.radians(dec_deg)
        return {
            "equatorial": {
                "ra_deg": ra_deg,
                "dec_deg": dec_deg,
                "ra_rad": ra_rad,
                "dec_rad": dec_rad,
                "ra_hs": ra_deg / 15
            },
            "cartesian": {
                "x": math.cos(ra_rad) * math.cos(dec_rad),
                "y": math.sin(ra_rad) * math.cos(dec_rad),
                "z": math.sin(dec_rad)
            }
        }
