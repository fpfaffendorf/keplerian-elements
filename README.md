# keplerian-elements

keplerianelements.com

## Populating the mongoDB database

### Run the following scripts in order

Populate the mongoDB database and collections by running the following
scripts in order.

1. constellations_drop.py
2. constellations_upsert_name.py
3. constellations_upsert_lines.py
4. constellations_upsert_boundaries.py
5. constellations_upsert_interpolate_boundaries.py
6. constellations_upsert_limits.py
7. stars_upsert_hipparcos_6.py
8. stars_upsert_names.py