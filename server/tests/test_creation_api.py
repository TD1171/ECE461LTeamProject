from copy import deepcopy

from server.app import create_app
from server.dummyHardwareData import InMemoryHardwareCollection
from server.dummyProjectData import InMemoryProjectCollection


class FakeUserCollection:
    def __init__(self):
        self.documents = []

    def find_one(self, query):
        for document in self.documents:
            if all(document.get(key) == value for key, value in query.items()):
                return deepcopy(document)
        return None

    def insert_one(self, document):
        self.documents.append(deepcopy(document))


def make_client():
    app = create_app(
        {"TESTING": True, "HARDWARE_DATA_SOURCE": "dummy"},
        hardware_collection=InMemoryHardwareCollection([]),
        projects_collection=InMemoryProjectCollection([]),
        user_collection=FakeUserCollection(),
    )
    return app.test_client()


def test_add_user_stores_hashed_password_and_returns_safe_user():
    client = make_client()

    response = client.post(
        "/add_user",
        json={"username": "Ada", "userId": "ada-1", "password": "secret"},
    )

    assert response.status_code == 201
    assert response.get_json() == {
        "user": {"username": "Ada", "userId": "ada-1", "projects": []}
    }
    stored_user = client.application.extensions["user_collection"].documents[0]
    assert stored_user["password"] != "secret"
    assert stored_user["password"]


def test_create_hardware_set_stores_and_returns_inventory_record():
    client = make_client()

    response = client.post(
        "/api/hardware",
        json={
            "name": "Oscilloscope",
            "capacity": 4,
            "description": "Bench scope",
            "location": "Lab A",
        },
    )

    assert response.status_code == 201
    assert response.get_json() == {
        "name": "Oscilloscope",
        "capacity": 4,
        "available": 4,
        "description": "Bench scope",
        "location": "Lab A",
        "specifications": {},
    }

    inventory = client.get("/api/hardware")
    assert inventory.status_code == 200
    assert inventory.get_json()["hardware"][0]["name"] == "Oscilloscope"


def test_create_hardware_set_rejects_invalid_capacity():
    response = make_client().post(
        "/api/hardware", json={"name": "Oscilloscope", "capacity": -1}
    )

    assert response.status_code == 400
    assert "Capacity" in response.get_json()["error"]
