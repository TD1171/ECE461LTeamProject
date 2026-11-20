"""Owner rules: transfer ownership and delete a project."""

from server.app import create_app
from server.dummyProjectData import InMemoryProjectCollection


def make_app(hw_sets=None, users=None):
    projects = InMemoryProjectCollection([{
        "projectName": "Robot Arm",
        "projectId": "robot-arm",
        "description": "",
        "hwSets": hw_sets or {},
        "users": ["sydney", "alice"],
        "owner": "sydney",
    }])
    app = create_app(
        {"TESTING": True},
        hardware_collection=InMemoryProjectCollection([]),
        projects_collection=projects,
        user_collection=users,
    )
    return app.test_client()


def transfer(client, user_id="sydney", new_owner="alice"):
    return client.put(
        "/api/projects/robot-arm/owner",
        json={"userId": user_id, "newOwnerId": new_owner},
    )


def delete(client, user_id="sydney"):
    return client.delete("/api/projects/robot-arm", json={"userId": user_id})


# --- Transfer ownership ----------------------------------------------------

def test_owner_can_transfer_to_a_member():
    client = make_app()

    response = transfer(client)

    assert response.status_code == 200
    assert response.get_json()["owner"] == "alice"


def test_previous_owner_becomes_a_regular_member():
    client = make_app()
    transfer(client)

    project = client.get("/api/projects/robot-arm").get_json()
    assert "sydney" in project["users"]
    # Now a regular member, so sydney can leave and can't transfer again.
    assert transfer(client, user_id="sydney", new_owner="alice").status_code == 403
    assert client.delete("/api/projects/robot-arm/users/sydney").status_code == 200


def test_new_owner_cannot_leave_but_can_transfer_back():
    client = make_app()
    transfer(client)

    assert client.delete("/api/projects/robot-arm/users/alice").status_code == 409
    assert transfer(client, user_id="alice", new_owner="sydney").get_json()["owner"] == "sydney"


def test_non_owner_cannot_transfer():
    client = make_app()

    response = transfer(client, user_id="alice", new_owner="alice")

    assert response.status_code == 403
    assert client.get("/api/projects/robot-arm").get_json()["owner"] == "sydney"


def test_cannot_transfer_to_a_non_member():
    client = make_app()

    response = transfer(client, new_owner="bob")

    assert response.status_code == 409
    assert client.get("/api/projects/robot-arm").get_json()["owner"] == "sydney"


def test_transfer_to_yourself_is_rejected():
    assert transfer(make_app(), new_owner="sydney").status_code == 400


def test_transfer_on_unknown_project_returns_404():
    client = make_app()
    response = client.put(
        "/api/projects/nope/owner", json={"userId": "sydney", "newOwnerId": "alice"}
    )
    assert response.status_code == 404


# --- Delete project --------------------------------------------------------

def test_owner_can_delete_when_nothing_is_checked_out():
    client = make_app(hw_sets={"HWSet1": 0, "HWSet2": 0})

    response = delete(client)

    assert response.status_code == 200
    assert client.get("/api/projects/robot-arm").status_code == 404


def test_owner_cannot_delete_while_any_hardware_is_out():
    client = make_app(hw_sets={"HWSet1": 0, "HWSet2": 3})

    response = delete(client)

    assert response.status_code == 409
    assert "Check in" in response.get_json()["error"]
    assert client.get("/api/projects/robot-arm").status_code == 200


def test_non_owner_member_cannot_delete():
    client = make_app()

    response = delete(client, user_id="alice")

    assert response.status_code == 403
    assert client.get("/api/projects/robot-arm").status_code == 200


def test_delete_without_user_id_returns_400():
    client = make_app()
    response = client.delete("/api/projects/robot-arm", json={})
    assert response.status_code == 400


def test_delete_removes_project_from_every_members_list():
    users = InMemoryProjectCollection([
        {"userId": "sydney", "projects": ["robot-arm", "other"]},
        {"userId": "alice", "projects": ["robot-arm"]},
    ])
    client = make_app(users=users)

    assert delete(client).status_code == 200
    assert users.find_one({"userId": "sydney"})["projects"] == ["other"]
    assert users.find_one({"userId": "alice"})["projects"] == []