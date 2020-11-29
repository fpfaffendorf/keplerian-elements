# Status: SEALED

import sys


"""
Get command line argument by its --name.
"""


class GetArg:

    @staticmethod
    def str_to_bool(s):
        return s.lower() == "true"

    @staticmethod
    def get(name, default, convert):
        """
        Get the argument by its name. Return default if it wasn't found.
        """
        for argument in sys.argv:
            if (argument.startswith(f"--{name}=")):
                value = argument.replace(f"--{name}=", "").strip()
                if (convert != None):
                    return convert(value)
                else:
                    return value
        return default
