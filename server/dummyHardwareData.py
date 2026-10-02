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
    """Read-only subset of the PyMongo collection API for local development."""

    def __init__(self, documents):
        self._documents = deepcopy(documents)

    def find(self, query):
        return deepcopy(self._documents)

    def find_one(self, query):
        for document in self._documents:
            if all(document.get(key) == value for key, value in query.items()):
                return deepcopy(document)
        return None
