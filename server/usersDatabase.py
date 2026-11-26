"""User accounts: sign up, sign in, and each user's list of project IDs.

Passwords are never stored as typed. addUser saves a salted hash
(werkzeug's generate_password_hash) and login compares with
check_password_hash, so the database never holds plain-text passwords.
Functions that return a user leave the hash out.

Membership is stored on both sides: the project lists its users and the
user lists its projects. joinProject/leaveProject keep the user's side in
sync after projectsDatabase has updated the project's side.
"""

from werkzeug.security import generate_password_hash, check_password_hash

'''
Structure of User entry:
User = {
    'username': username,
    'userId': userId,
    'password': password,
    'projects': [project1_ID, project2_ID, ...]
}
'''


def addUser(collection, username, userId, password):
    """Create a user unless the userId already exists."""

    existing_user = collection.find_one({"userId": userId})

    if existing_user is not None:
        return None

    user = {
        "username": username,
        "userId": userId,
        "password": generate_password_hash(password),
        "projects": [],
    }

    collection.insert_one(user)

    return {
        "username": username,
        "userId": userId,
        "projects": [],
    }


def __queryUser(client, username, userId):
    """Unused template stub. Lookups use collection.find_one directly."""
    # Query and return a user from the database
    pass


def login(collection, userId, password):
    """Authenticate a user by user ID and password."""

    user = collection.find_one({"userId": userId})

    if user is None:
        return None

    if not check_password_hash(user["password"], password):
        return None

    return {
        "username": user.get("username", userId),
        "userId": user["userId"],
        "projects": user.get("projects", []),
    }

def userExists(collection, userId):
    """Return True if a user with this userId is registered."""
    return collection.find_one({"userId": userId}) is not None


def joinProject(collection, userId, projectId):
    """Record projectId in the user's projects list (no duplicates).

    Call this after the project side has accepted the user, so both
    documents agree on membership. Returns True if the user was found.
    """
    result = collection.update_one(
        {"userId": userId},
        {"$addToSet": {"projects": projectId}},
    )
    return result.matched_count == 1

def leaveProject(collection, userId, projectId):
    """Remove projectId from the user's projects list (issue #9)."""
    result = collection.update_one(
        {"userId": userId},
        {"$pull": {"projects": projectId}},
    )
    return result.matched_count == 1


def getUserProjectsList(client, userId):
    """Unused template stub. The API uses projectsDatabase.listUserProjects
    (GET /api/users/<id>/projects) instead.
    """
    # Get and return the list of projects a user is part of
    pass