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
from pymongo import ReturnDocument


PROJECT_ID_PATTERN = re.compile(r"^[A-Za-z0-9_-]{1,32}$")
MAX_NAME_LENGTH = 100
MAX_DESCRIPTION_LENGTH = 1000


class ProjectExistsError(Exception):
    """Raised when a project with the requested projectId already exists."""



class ProjectNotFoundError(Exception):
    """Raised when an operation targets a projectId that does not exist."""


class AlreadyMemberError(Exception):
    """Raised when a user tries to join a project they already belong to."""


class HardwareRequestError(Exception):
    """Raised when a project cannot complete a hardware request."""

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
        # Projects made before the owner rule have no owner (None).
        "owner": document.get("owner"),
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
        # The creator owns the project and can never leave it.
        "owner": creatorId,
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


def listUserProjects(collection, userId):
    """Return every project the user belongs to (issue #6: View My Projects).

    In MongoDB, {"users": userId} matches any project whose users list
    contains userId. Projects come back sorted by name so the dashboard
    order is stable. Raises ValueError if userId is missing.
    """
    if not isinstance(userId, str) or not userId.strip():
        raise ValueError("User ID is required.")
    userId = userId.strip()

    projects = [
        serializeProject(document)
        for document in collection.find({"users": userId})
    ]
    return sorted(projects, key=lambda project: project["projectName"].lower())


def listProjects(collection):
    """Return every project sorted by name."""
    projects = [serializeProject(document) for document in collection.find({})]
    return sorted(projects, key=lambda project: project["projectName"].lower())

def _requireText(value, label):
    """Return value stripped, or raise ValueError if it is missing."""
    if not isinstance(value, str) or not value.strip():
        raise ValueError(f"{label} is required.")
    return value.strip()


def transferOwnership(collection, projectId, requesterId, newOwnerId):
    """Make newOwnerId the owner. Only the current owner can do this.

    The new owner must already be a member. The previous owner stays a
    member, just a regular one. Returns the updated project.
    """
    projectId = _requireText(projectId, "Project ID")
    requesterId = _requireText(requesterId, "User ID")
    newOwnerId = _requireText(newOwnerId, "New owner")

    project = collection.find_one({"projectId": projectId})
    if project is None:
        raise ProjectNotFoundError(f"Project '{projectId}' was not found.")
    if project.get("owner") != requesterId:
        raise NotOwnerError("Only the project's owner can transfer ownership.")
    if newOwnerId == requesterId:
        raise ValueError("You already own this project.")
    if newOwnerId not in project.get("users", []):
        raise NotMemberError(f"'{newOwnerId}' is not a member of this project.")

    # Matching on the current owner AND membership means a request that
    # raced with another change (e.g. the member left) does nothing.
    result = collection.update_one(
        {"projectId": projectId, "owner": requesterId, "users": newOwnerId},
        {"$set": {"owner": newOwnerId}},
    )
    if result.matched_count == 0:
        raise NotOwnerError("Ownership changed; reload the project and try again.")
    return queryProject(collection, projectId)


def deleteProject(collection, projectId, requesterId):
    """Delete a project. Only the owner can, and only with no hardware out.

    Returns the deleted project (so callers know which users to update).
    """
    projectId = _requireText(projectId, "Project ID")
    requesterId = _requireText(requesterId, "User ID")

    project = collection.find_one({"projectId": projectId})
    if project is None:
        raise ProjectNotFoundError(f"Project '{projectId}' was not found.")
    if project.get("owner") != requesterId:
        raise NotOwnerError("Only the project's owner can delete it.")
    if _holdsHardware(project):
        raise HardwareStillCheckedOutError(
            "Check in all of this project's hardware before deleting it."
        )

    result = collection.delete_one({"projectId": projectId, "owner": requesterId})
    if result.deleted_count == 0:
        raise NotOwnerError("Ownership changed; reload the project and try again.")
    return serializeProject(project)


# --- Not yet implemented (see issues #5 and #18-#24) -----------------------

def addUser(collection, projectId, userId):
    """Add a user to the specified project (issue #5: Join a Project).

    The update only matches when the user is not already listed, so two
    simultaneous joins can never add the same user twice. Returns the updated
    project. Raises ValueError for missing input, ProjectNotFoundError for an
    unknown projectId, and AlreadyMemberError if the user already belongs.
    """
    if not isinstance(userId, str) or not userId.strip():
        raise ValueError("User ID is required.")
    userId = userId.strip()

    if not isinstance(projectId, str) or not projectId.strip():
        raise ValueError("Project ID is required.")
    projectId = projectId.strip()

    result = collection.update_one(
        {"projectId": projectId, "users": {"$ne": userId}},
        {"$addToSet": {"users": userId}},
    )

    if result.matched_count == 0:
        # Nothing matched: either the project is missing or the user is
        # already a member. Look it up to tell the two apart.
        if collection.find_one({"projectId": projectId}) is None:
            raise ProjectNotFoundError(f"Project '{projectId}' was not found.")
        raise AlreadyMemberError(
            f"You are already a member of project '{projectId}'."
        )

    return queryProject(collection, projectId)

# --- Leave a Project (issue #9) -------------------------------------------

class NotMemberError(Exception):
    """Raised when a user tries to leave a project they do not belong to."""


class OwnerCannotLeaveError(Exception):
    """Raised when the project's owner (its creator) tries to leave."""


class NotOwnerError(Exception):
    """Raised when someone other than the owner tries an owner-only action."""


class HardwareStillCheckedOutError(Exception):
    """Raised when the last member tries to leave while hardware is out."""


def _holdsHardware(document):
    """True if the project has any hardware checked out (any qty above 0)."""
    return any(qty > 0 for qty in document.get("hwSets", {}).values())


def removeUser(collection, projectId, userId):
    """Remove a user from the specified project (issue #9: Leave a Project).

    Returns the updated project. Raises ValueError for missing input,
    ProjectNotFoundError for an unknown projectId, NotMemberError if the user
    does not belong to it, OwnerCannotLeaveError for the owner, and
    HardwareStillCheckedOutError as above.
    """
    if not isinstance(userId, str) or not userId.strip():
        raise ValueError("User ID is required.")
    userId = userId.strip()

    if not isinstance(projectId, str) or not projectId.strip():
        raise ValueError("Project ID is required.")
    projectId = projectId.strip()

    project = collection.find_one({"projectId": projectId})
    if project is None:
        raise ProjectNotFoundError(f"Project '{projectId}' was not found.")
    if userId not in project.get("users", []):
        raise NotMemberError(f"You are not a member of project '{projectId}'.")
    if userId == project.get("owner"):
        raise OwnerCannotLeaveError(
            "You own this project, so you can't leave it. Transfer ownership "
            "to another member first, or delete the project."
        )

    isLastMember = project.get("users", []) == [userId]
    if isLastMember and _holdsHardware(project):
        raise HardwareStillCheckedOutError(
            "You are the last member, so check in this project's hardware "
            "before leaving."
        )

    # The update still only matches when the user IS listed, so if another
    # request removed them a moment ago we report it instead of double-leaving.
    result = collection.update_one(
        {"projectId": projectId, "users": userId},
        {"$pull": {"users": userId}},
    )
    if result.matched_count == 0:
        raise NotMemberError(f"You are not a member of project '{projectId}'.")

    return queryProject(collection, projectId)


# --- Not yet implemented (see issues #18-#24) ------------------------------


def updateUsage(collection, projectId, hwSetName):
    """Update the usage of a hardware set in the specified project."""
    raise NotImplementedError


def checkOutHW(collection, projectId, hwSetName, qty, userId):
    """Atomically reserve project holdings for units already deducted from inventory."""
    if not isinstance(qty, int) or qty <= 0:
        raise ValueError("Requested amount must be a positive integer.")
    updated = collection.find_one_and_update(
        {"projectId": projectId},
        {"$inc": {f"hwSets.{hwSetName}": qty}},
        return_document=ReturnDocument.AFTER,
    )
    if updated is None:
        raise ProjectNotFoundError(f"Project '{projectId}' was not found.")
    return serializeProject(updated)


def checkInHW(collection, projectId, hwSetName, qty, userId):
    """Subtract returned units only when the project currently holds enough."""
    if not isinstance(qty, int) or qty <= 0:
        raise ValueError("Requested amount must be a positive integer.")
    updated = collection.find_one_and_update(
        {"projectId": projectId, f"hwSets.{hwSetName}": {"$gte": qty}},
        {"$inc": {f"hwSets.{hwSetName}": -qty}},
        return_document=ReturnDocument.AFTER,
    )
    if updated is None:
        if collection.find_one({"projectId": projectId}) is None:
            raise ProjectNotFoundError(f"Project '{projectId}' was not found.")
        raise HardwareRequestError("Project does not hold that many units.")
    return serializeProject(updated)