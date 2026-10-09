"""Data-access helpers for hardware-set data.

These functions operate on a small collection interface shared by PyMongo and
the in-memory development collection. The React API therefore stays unchanged
when the team connects MongoDB later.
"""

from pymongo import ReturnDocument


class HardwareExistsError(Exception):
    """Raised when a hardware set name is already in use."""


def serializeHardwareSet(document):
    """Convert a stored hardware document into the public API shape."""
    if document is None:
        return None

    return {
        "name": document.get("name") or document.get("hwName"),
        "capacity": document.get("capacity", 0),
        "available": document.get("available", document.get("availability", 0)),
        "description": document.get("description", ""),
        "location": document.get("location", ""),
        "specifications": document.get("specifications", {}),
    }


def createHardwareSet(collection, hwSetName, initCapacity, **details):
    """Create a hardware set and return its normalized representation."""
    if not isinstance(hwSetName, str) or not hwSetName.strip():
        raise ValueError("Hardware set name is required.")
    hwSetName = hwSetName.strip()
    if not isinstance(initCapacity, int) or initCapacity < 0:
        raise ValueError("Capacity must be a nonnegative integer.")
    if collection.find_one({"hwName": hwSetName}) is not None:
        raise HardwareExistsError(f"Hardware set '{hwSetName}' already exists.")

    document = {
        "hwName": hwSetName,
        "capacity": initCapacity,
        "availability": initCapacity,
        **details,
    }
    collection.insert_one(document)
    return serializeHardwareSet(document)


def queryHardwareSet(collection, hwSetName):
    """Return one hardware set by name, supporting the starter schema."""
    document = collection.find_one({"hwName": hwSetName})
    if document is None:
        document = collection.find_one({"name": hwSetName})
    return serializeHardwareSet(document)


def listHardwareSets(collection):
    """Return all hardware sets in a stable display order."""
    documents = collection.find({})
    return sorted(
        (serializeHardwareSet(document) for document in documents),
        key=lambda hardware: hardware["name"].casefold(),
    )


def updateAvailability(collection, hwSetName, newAvailability):
    """Set availability while preventing values outside capacity bounds."""
    if not isinstance(newAvailability, int) or newAvailability < 0:
        raise ValueError("Availability must be a nonnegative integer.")

    document = collection.find_one({"hwName": hwSetName})
    if document is None:
        return None
    if newAvailability > document["capacity"]:
        raise ValueError("Availability cannot exceed capacity.")

    updated = collection.find_one_and_update(
        {"hwName": hwSetName},
        {"$set": {"availability": newAvailability}},
        return_document=ReturnDocument.AFTER,
    )
    return serializeHardwareSet(updated)


def requestSpace(collection, hwSetName, amount):
    """Atomically reserve available units for future checkout work."""
    if not isinstance(amount, int) or amount <= 0:
        raise ValueError("Requested amount must be a positive integer.")

    updated = collection.find_one_and_update(
        {"hwName": hwSetName, "availability": {"$gte": amount}},
        {"$inc": {"availability": -amount}},
        return_document=ReturnDocument.AFTER,
    )
    return serializeHardwareSet(updated)


def getAllHwNames(collection):
    """Return hardware names for compatibility with the starter API."""
    return [hardware["name"] for hardware in listHardwareSets(collection)]
