"""Temporary hardware records used until the shared MongoDB is available."""

from copy import deepcopy


DUMMY_HARDWARE = [
    {
        "hwName": "HWSet1",
        "capacity": 100,
        "availability": 80,
        "description": "General-purpose embedded development hardware.",
        "location": "Engineering Lab A",
        "specifications": {"Board": "Development Kit A", "Condition": "Ready"},
    },
    {
        "hwName": "HWSet2",
        "capacity": 100,
        "availability": 90,
        "description": "Sensor and peripheral kit for project prototyping.",
        "location": "Engineering Lab B",
        "specifications": {"Kit": "Sensor Pack B", "Condition": "Ready"},
    },
]


class InMemoryHardwareCollection:
    """Small PyMongo-like collection used for local development and tests."""

    def __init__(self, documents):
        self._documents = deepcopy(documents)

    def find(self, query):
        return deepcopy(self._documents)

    def find_one(self, query):
        for document in self._documents:
            if all(document.get(key) == value for key, value in query.items()):
                return deepcopy(document)
        return None

    def insert_one(self, document):
        self._documents.append(deepcopy(document))

    def find_one_and_update(self, query, update, return_document=None):
        hardware_name = query.get("hwName")
        minimum = query.get("availability", {}).get("$gte", 0)

        for document in self._documents:
            if document.get("hwName") != hardware_name:
                continue
            if document.get("availability", 0) < minimum:
                continue

            if "availability" in update.get("$inc", {}):
                document["availability"] += update["$inc"]["availability"]
            if "availability" in update.get("$set", {}):
                document["availability"] = update["$set"]["availability"]
            return deepcopy(document)
        return None
