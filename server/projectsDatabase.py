"""Data-access helpers for project data.

Like hardwareDatabase, these functions operate on a small collection interface
shared by PyMongo and the in-memory development collection, so the API does not
change when the team connects MongoDB.

Structure of a stored project document:
Project = {
    'projectName': projectName,
    'projectId': projectId,
    'description': description,
    'hwSets': {HW1: 0, HW2: 10, ...},
    'users': [user1, user2, ...]
}
"""

import re

from pymongo.errors import DuplicateKeyError


PROJECT_ID_PATTERN = re.compile(r"^[A-Za-z0-9_-]{1,32}$")
MAX_NAME_LENGTH = 100
MAX_DESCRIPTION_LENGTH = 1000


class ProjectExistsError(Exception):
    """Raised when a project with the requested projectId already exists."""


def serializeProject(document):
    """Convert a stored project document into the public API shape."""
    if document is None:
        return None

    return {
        "projectName": document.get("projectName", ""),
        "projectId": document.get("projectId", ""),
        "description": document.get("description", ""),
        "hwSets": dict(document.get("hwSets", {})),
        "users": list(document.get("users", [])),
    }


def _validateProjectFields(projectName, projectId, description):
    """Return cleaned fields or raise ValueError with a user-facing message."""
    if not isinstance(projectName, str) or not projectName.strip():
        raise ValueError("Project name is required.")
    projectName = projectName.strip()
    if len(projectName) > MAX_NAME_LENGTH:
        raise ValueError(
            f"Project name must be {MAX_NAME_LENGTH} characters or fewer."
        )

    if not isinstance(projectId, str) or not projectId.strip():
        raise ValueError("Project ID is required.")
    projectId = projectId.strip()
    if not PROJECT_ID_PATTERN.match(projectId):
        raise ValueError(
            "Project ID must be 1-32 characters using letters, numbers, "
            "hyphens, or underscores."
        )

    if description is None:
        description = ""
    if not isinstance(description, str):
        raise ValueError("Description must be text.")
    description = description.strip()
    if len(description) > MAX_DESCRIPTION_LENGTH:
        raise ValueError(
            f"Description must be {MAX_DESCRIPTION_LENGTH} characters or fewer."
        )

    return projectName, projectId, description


def queryProject(collection, projectId):
    """Return one project by its ID, or None if it does not exist."""
    return serializeProject(collection.find_one({"projectId": projectId}))


def createProject(collection, projectName, projectId, description="", creatorId=None):
    """Create a new project and return its normalized representation.

    The creator, when known, becomes the project's first member. Raises
    ValueError for invalid input and ProjectExistsError for a taken projectId.
    """
    projectName, projectId, description = _validateProjectFields(
        projectName, projectId, description
    )

    if collection.find_one({"projectId": projectId}) is not None:
        raise ProjectExistsError(f"Project ID '{projectId}' is already taken.")

    document = {
        "projectName": projectName,
        "projectId": projectId,
        "description": description,
        "hwSets": {},
        "users": [creatorId] if creatorId else [],
    }
    try:
        collection.insert_one(document)
    except DuplicateKeyError as error:
        # Covers the race where two requests claim the same ID at once
        # (requires the unique index on projectId created in app.py).
        raise ProjectExistsError(
            f"Project ID '{projectId}' is already taken."
        ) from error
    return serializeProject(document)


# --- Not yet implemented (see issues #5 and #18-#24) -----------------------

def addUser(collection, projectId, userId):
    """Add a user to the specified project (issue #5: Join a Project)."""
    raise NotImplementedError


def updateUsage(collection, projectId, hwSetName):
    """Update the usage of a hardware set in the specified project."""
    raise NotImplementedError


def checkOutHW(collection, projectId, hwSetName, qty, userId):
    """Check out hardware for the specified project and update availability."""
    raise NotImplementedError


def checkInHW(collection, projectId, hwSetName, qty, userId):
    """Check in hardware for the specified project and update availability."""
    raise NotImplementedError