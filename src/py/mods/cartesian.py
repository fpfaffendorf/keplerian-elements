# Status: SEALED

"""
Cartesian conversion.
"""

import math


class Cartesian:

    @staticmethod
    def get(ra_deg, dec_deg):
        """
        Return the cartesian from RA/Dec coordinates
        """
        ra_rad = math.radians(ra_deg)
        dec_rad = math.radians(dec_deg)
        return (
            math.cos(ra_rad) * math.cos(dec_rad),
            math.sin(ra_rad) * math.cos(dec_rad),
            math.sin(dec_rad)
        )
