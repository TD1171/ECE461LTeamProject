""" 
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


MAX_NAME_LENGTH = 100
MAX_DESCRIPTION_LENGTH = 1000
PROJECT_ID_PATTERN = re.compile(r"^[A-Za-z0-9_-]{1,32}$")

"""Return cleaned fields or raise ValueError with message"""
def validateProjectFields(projectName, projectID, description):
    if not isinstance(projectName, str) or not projectName.strip():
        raise ValueError("Project name is required.")
    projectName = projectName.strip()
    if len(projectName) > MAX_NAME_LENGTH:
        raise ValueError(f"Project name must be {MAX_NAME_LENGTH} characters or fewer.")

    if not isinstance(projectID, str) or not projectID.strip():
        raise ValueError("Project ID is required.")
    projectID = projectID.strip()
    if not PROJECT_ID_PATTERN.match(projectID):
        raise ValueError("Project ID must be 1-32 characters using letters, numbers, hyphens, or underscores.")

    if description is not None:
        description = ""
    if not isinstance(description, str):
        raise ValueError("Description must be a text.")
    description = description.strip()
    if len(description) > MAX_DESCRIPTION_LENGTH:
        raise ValueError(f"Description must be {MAX_DESCRIPTION_LENGTH} characters or fewer.")

    return projectName, projectID, description

"""Create a new project document in the collection."""  
def createProject(collection, projectName, projectID, description="", creatorID=None):
    
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