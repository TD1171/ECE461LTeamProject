from server.app import create_app
from server.dummyHardwareData import InMemoryHardwareCollection
from server.dummyProjectData import InMemoryProjectCollection


def make_client(available=5, checked_out=0, capacity=100):
    hardware = InMemoryHardwareCollection([
        {"hwName": "HWSet1", "capacity": capacity, "availability": available}
    ])
    app = create_app(
        {"TESTING": True, "HARDWARE_DATA_SOURCE": "dummy"},
        hardware_collection=hardware,
        projects_collection=InMemoryProjectCollection([{
            "projectName": "Test Project",
            "projectId": "test-project",
            "description": "",
            "hwSets": {"HWSet1": checked_out} if checked_out else {},
            "users": [],
        }]),
        user_collection=None,
    )
    return app.test_client()


def test_checkout_reduces_availability():
    client = make_client()

    response = client.post(
        "/check_out",
        json={"projectId": "test-project", "hardwareName": "HWSet1", "quantity": 3},
    )

    assert response.status_code == 200
    assert response.get_json()["hardware"]["available"] == 2


def test_checkout_rejects_quantity_over_availability_without_changing_it():
    client = make_client()

    response = client.post(
        "/check_out",
        json={"projectId": "test-project", "hardwareName": "HWSet1", "quantity": 6},
    )

    assert response.status_code == 409
    inventory = client.get("/api/hardware").get_json()["hardware"]
    assert inventory[0]["available"] == 5


def test_checkin_returns_hardware_when_inventory_is_below_capacity():
    client = make_client(available=70, checked_out=30)

    response = client.post(
        "/check_in",
        json={"projectId": "test-project", "hardwareName": "HWSet1", "quantity": 5},
    )

    assert response.status_code == 200
    assert response.get_json()["hardware"]["available"] == 75
    assert response.get_json()["project"]["hwSets"]["HWSet1"] == 25


def test_checkin_rejects_return_that_would_exceed_capacity():
    client = make_client(available=9, checked_out=2, capacity=10)

    response = client.post(
        "/check_in",
        json={"projectId": "test-project", "hardwareName": "HWSet1", "quantity": 2},
    )

    assert response.status_code == 409
    inventory = client.get("/api/hardware").get_json()["hardware"]
    assert inventory[0]["available"] == 9
