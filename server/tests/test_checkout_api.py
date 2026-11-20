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
            "users": ["sydney"],
        }]),
        user_collection=None,
    )
    return app.test_client()


def test_checkout_reduces_availability():
    client = make_client()

    response = client.post(
        "/check_out",
        json={"projectId": "test-project", "hardwareName": "HWSet1", "quantity": 3, "userId": "sydney"},
    )

    assert response.status_code == 200
    assert response.get_json()["hardware"]["available"] == 2


def test_checkout_rejects_quantity_over_availability_without_changing_it():
    client = make_client()

    response = client.post(
        "/check_out",
        json={"projectId": "test-project", "hardwareName": "HWSet1", "quantity": 6, "userId": "sydney"},
    )

    assert response.status_code == 409
    inventory = client.get("/api/hardware").get_json()["hardware"]
    assert inventory[0]["available"] == 5


def test_checkin_returns_hardware_when_inventory_is_below_capacity():
    client = make_client(available=70, checked_out=30)

    response = client.post(
        "/check_in",
        json={"projectId": "test-project", "hardwareName": "HWSet1", "quantity": 5, "userId": "sydney"},
    )

    assert response.status_code == 200
    assert response.get_json()["hardware"]["available"] == 75
    assert response.get_json()["project"]["hwSets"]["HWSet1"] == 25


def test_checkin_rejects_return_that_would_exceed_capacity():
    client = make_client(available=9, checked_out=2, capacity=10)

    response = client.post(
        "/check_in",
        json={"projectId": "test-project", "hardwareName": "HWSet1", "quantity": 2, "userId": "sydney"},
    )

    assert response.status_code == 409
    inventory = client.get("/api/hardware").get_json()["hardware"]
    assert inventory[0]["available"] == 9

def test_checkout_to_missing_project_returns_404_and_keeps_inventory():
    client = make_client(available=5)

    response = client.post(
        "/check_out",
        json={"projectId": "no-such-project", "hardwareName": "HWSet1", "quantity": 2, "userId": "sydney"},
    )

    assert response.status_code == 404
    inventory = client.get("/api/hardware").get_json()["hardware"]
    assert inventory[0]["available"] == 5

# --- Test case 17: only members can check hardware out or in ---------------

def test_non_member_cannot_check_out_and_inventory_is_unchanged():
    client = make_client(available=5)

    response = client.post(
        "/check_out",
        json={"projectId": "test-project", "hardwareName": "HWSet1", "quantity": 2, "userId": "stranger"},
    )

    assert response.status_code == 403
    inventory = client.get("/api/hardware").get_json()["hardware"]
    assert inventory[0]["available"] == 5


def test_non_member_cannot_check_in_and_inventory_is_unchanged():
    client = make_client(available=70, checked_out=30)

    response = client.post(
        "/check_in",
        json={"projectId": "test-project", "hardwareName": "HWSet1", "quantity": 5, "userId": "stranger"},
    )

    assert response.status_code == 403
    inventory = client.get("/api/hardware").get_json()["hardware"]
    assert inventory[0]["available"] == 70


def test_checkout_without_user_id_returns_400():
    client = make_client(available=5)

    response = client.post(
        "/check_out",
        json={"projectId": "test-project", "hardwareName": "HWSet1", "quantity": 2},
    )

    assert response.status_code == 400
    inventory = client.get("/api/hardware").get_json()["hardware"]
    assert inventory[0]["available"] == 5


def test_member_who_did_not_check_out_can_still_check_in():
    # Test case 18: the TA joins and returns hardware the first user took.
    hardware = InMemoryHardwareCollection([
        {"hwName": "HWSet1", "capacity": 100, "availability": 70}
    ])
    app = create_app(
        {"TESTING": True, "HARDWARE_DATA_SOURCE": "dummy"},
        hardware_collection=hardware,
        projects_collection=InMemoryProjectCollection([{
            "projectName": "Shared", "projectId": "shared", "description": "",
            "hwSets": {"HWSet1": 30}, "users": ["sydney", "ta"], "owner": "sydney",
        }]),
        user_collection=None,
    )
    client = app.test_client()

    response = client.post(
        "/check_in",
        json={"projectId": "shared", "hardwareName": "HWSet1", "quantity": 5, "userId": "ta"},
    )

    assert response.status_code == 200
    assert response.get_json()["hardware"]["available"] == 75