from server.app import create_app
from server.dummyHardwareData import InMemoryHardwareCollection
from server.dummyProjectData import InMemoryProjectCollection


def make_client(available=5):
    hardware = InMemoryHardwareCollection([
        {"hwName": "HWSet1", "capacity": 10, "availability": available}
    ])
    app = create_app(
        {"TESTING": True, "HARDWARE_DATA_SOURCE": "dummy"},
        hardware_collection=hardware,
        projects_collection=InMemoryProjectCollection([]),
        user_collection=None,
    )
    return app.test_client()


def test_checkout_reduces_availability():
    client = make_client()

    response = client.post(
        "/check_out",
        json={"hardwareName": "HWSet1", "quantity": 3},
    )

    assert response.status_code == 200
    assert response.get_json()["hardware"]["available"] == 2


def test_checkout_rejects_quantity_over_availability_without_changing_it():
    client = make_client()

    response = client.post(
        "/check_out",
        json={"hardwareName": "HWSet1", "quantity": 6},
    )

    assert response.status_code == 409
    inventory = client.get("/api/hardware").get_json()["hardware"]
    assert inventory[0]["available"] == 5
