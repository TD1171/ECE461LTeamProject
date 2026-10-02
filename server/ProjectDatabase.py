""" 
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

MAX_NAME_LENGTH = 100
MAX_DESCRIPTION_LENGTH = 1000

def createProject(collection, projectName, projectID, description="", creatorID=None):
    """Create a new project document in the collection."""

    # Validate input lengths
    if len(projectName) > MAX_NAME_LENGTH:
        raise ValueError("Project name exceeds maximum length.")
    if len(description) > MAX_DESCRIPTION_LENGTH:
        raise ValueError("Description exceeds maximum length.")

    # TODO: Check if a project with the same ID already exists
    # if collection.find_one({"projectId": projectID}):
    #     raise ValueError("A project with this ID already exists.")

    project = {
        'projectName': projectName,
        'projectId': projectID,
        'description': description,
        'hwSets': {},
        'users': [creatorID] if creatorID else []
    }

    collection.insert_one(project)

    return project

# def addUser(collection, projectID, userID):
#     """Add a user to a project document in the collection."""
#     raise NotImplementedError("This function is not yet implemented.")