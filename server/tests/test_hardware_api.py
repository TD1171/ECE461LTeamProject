from copy import deepcopy

from server.app import create_app


class FakeHardwareCollection:
    def __init__(self, documents):
        self.documents = deepcopy(documents)

    def find(self, query):
        return deepcopy(self.documents)

    def find_one(self, query):
        for document in self.documents:
            if all(document.get(key) == value for key, value in query.items()):
                return deepcopy(document)
        return None


DOCUMENTS = [
    {
        "hwName": "HWSet2",
        "capacity": 100,
        "availability": 90,
        "description": "Sensor kit",
        "location": "Lab B",
        "specifications": {"condition": "ready"},
    },
    {
        "hwName": "HWSet1",
        "capacity": 100,
        "availability": 80,
        "description": "Development kit",
        "location": "Lab A",
        "specifications": {"condition": "ready"},
    },
]


def make_client(documents=DOCUMENTS):
    app = create_app(
        {"TESTING": True},
        hardware_collection=FakeHardwareCollection(documents),
    )
    return app.test_client()


def test_list_hardware_exposes_capacity_availability_and_details():
    response = make_client().get("/api/hardware")

    assert response.status_code == 200
    payload = response.get_json()
    assert [item["name"] for item in payload["hardware"]] == ["HWSet1", "HWSet2"]
    assert payload["hardware"][0] == {
        "name": "HWSet1",
        "capacity": 100,
        "available": 80,
        "description": "Development kit",
        "location": "Lab A",
        "specifications": {"condition": "ready"},
    }


def test_get_hardware_detail():
    response = make_client().get("/api/hardware/HWSet2")

    assert response.status_code == 200
    assert response.get_json()["available"] == 90
    assert response.get_json()["description"] == "Sensor kit"


def test_get_unknown_hardware_returns_404():
    response = make_client().get("/api/hardware/unknown")

    assert response.status_code == 404
    assert response.get_json() == {"error": "Hardware set not found."}
