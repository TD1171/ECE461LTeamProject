"""Temporary project storage used until the shared MongoDB is available."""

from copy import deepcopy


DUMMY_PROJECTS = [
    {
        "projectName": "Demo Project",
        "projectId": "demo-project",
        "description": "Sample project for local development.",
        "hwSets": {},
        "users": [],
    },
]


class InMemoryProjectCollection:
    """Small writable subset of the PyMongo collection API.

    Data lives only as long as the server process, so restarting Flask resets
    it to DUMMY_PROJECTS.
    """

    def __init__(self, documents):
        self._documents = deepcopy(documents)

    def find(self, query):
        return [
            deepcopy(document)
            for document in self._documents
            if all(document.get(key) == value for key, value in query.items())
        ]

    def find_one(self, query):
        matches = self.find(query)
        return matches[0] if matches else None

    def insert_one(self, document):
        self._documents.append(deepcopy(document))