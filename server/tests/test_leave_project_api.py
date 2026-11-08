"""Tests for removing a user from a project (issue #9: Leave a Project)."""

from pymongo.errors import PyMongoError

from server.app import create_app
from server.dummyProjectData import InMemoryProjectCollection


PROJECTS = [
    {
        "projectName": "Existing Project",
        "projectId": "existing",
        "description": "Already here",
        "hwSets": {},
        "users": ["alice", "sydney"],
    },
]

USERS = [
    {"username": "alice", "userId": "alice", "projects": ["existing"]},
    {"username": "sydney", "userId": "sydney", "projects": ["existing", "other"]},
    {"username": "bob", "userId": "bob", "projects": []},
]


def make_app(projects=None, users=None):
    """Build an app; pass users=None to mimic dummy mode (no user DB)."""
    return create_app(
        {"TESTING": True},
        hardware_collection=InMemoryProjectCollection([]),
        projects_collection=projects or InMemoryProjectCollection(PROJECTS),
        user_collection=users,
    )


def leave(client, project_id="existing", user_id="sydney"):
    return client.delete(f"/api/projects/{project_id}/users/{user_id}")


# --- Success cases --------------------------------------------------------

def test_leave_removes_user_and_returns_project():
    response = leave(make_app().test_client())

    assert response.status_code == 200
    assert response.get_json()["users"] == ["alice"]


def test_left_user_is_gone_when_project_is_fetched():
    client = make_app().test_client()
    leave(client)

    project = client.get("/api/projects/existing").get_json()

    assert "sydney" not in project["users"]


def test_left_project_disappears_from_users_dashboard_list():
    client = make_app().test_client()
    leave(client)

    response = client.get("/api/users/sydney/projects")

    assert response.get_json()["projects"] == []


def test_last_member_can_leave_and_project_stays():
    client = make_app().test_client()
    leave(client, user_id="alice")

    response = leave(client, user_id="sydney")

    assert response.status_code == 200
    assert response.get_json()["users"] == []
    assert client.get("/api/projects/existing").status_code == 200


def test_user_can_rejoin_after_leaving():
    client = make_app().test_client()
    leave(client)

    response = client.post(
        "/api/projects/existing/users", json={"userId": "sydney"}
    )

    assert response.status_code == 200
    assert "sydney" in response.get_json()["users"]


# --- Error cases ----------------------------------------------------------

def test_leaving_twice_returns_409():
    client = make_app().test_client()
    leave(client)

    response = leave(client)

    assert response.status_code == 409
    assert "not a member" in response.get_json()["error"]


def test_non_member_returns_409_and_changes_nothing():
    client = make_app().test_client()

    response = leave(client, user_id="bob")

    assert response.status_code == 409
    assert client.get("/api/projects/existing").get_json()["users"] == [
        "alice",
        "sydney",
    ]


def test_unknown_project_returns_404():
    response = leave(make_app().test_client(), project_id="nope")

    assert response.status_code == 404
    assert "not found" in response.get_json()["error"]


def test_blank_user_id_returns_400():
    response = leave(make_app().test_client(), user_id="%20%20")

    assert response.status_code == 400


# --- With a user database (like MongoDB mode) ------------------------------

def test_with_user_db_unknown_user_returns_404():
    users = InMemoryProjectCollection(USERS)
    response = leave(make_app(users=users).test_client(), user_id="ghost")

    assert response.status_code == 404
    assert "ghost" in response.get_json()["error"]


def test_with_user_db_project_is_removed_from_users_projects():
    users = InMemoryProjectCollection(USERS)

    response = leave(make_app(users=users).test_client())

    assert response.status_code == 200
    # Only the left project goes; the user's other projects stay.
    assert users.find_one({"userId": "sydney"})["projects"] == ["other"]


def test_with_user_db_non_member_keeps_users_projects():
    users = InMemoryProjectCollection(USERS)

    leave(make_app(users=users).test_client(), user_id="bob")

    assert users.find_one({"userId": "alice"})["projects"] == ["existing"]


# --- Hardware still checked out --------------------------------------------

def hardware_projects(users):
    """A project holding 5 of HWSet1, with the given members."""
    return InMemoryProjectCollection([
        {
            "projectName": "Busy Project",
            "projectId": "busy",
            "description": "",
            "hwSets": {"HWSet1": 5, "HWSet2": 0},
            "users": users,
        },
    ])


def test_last_member_cannot_leave_while_hardware_is_checked_out():
    projects = hardware_projects(["sydney"])

    response = leave(make_app(projects=projects).test_client(), project_id="busy")

    assert response.status_code == 409
    assert "check in" in response.get_json()["error"]
    assert projects.find_one({"projectId": "busy"})["users"] == ["sydney"]


def test_other_members_can_leave_while_hardware_is_checked_out():
    projects = hardware_projects(["alice", "sydney"])

    response = leave(make_app(projects=projects).test_client(), project_id="busy")

    assert response.status_code == 200
    assert response.get_json()["users"] == ["alice"]


def test_last_member_can_leave_once_all_hardware_is_returned():
    projects = InMemoryProjectCollection([
        {
            "projectName": "Done Project",
            "projectId": "done",
            "description": "",
            "hwSets": {"HWSet1": 0},
            "users": ["sydney"],
        },
    ])

    response = leave(make_app(projects=projects).test_client(), project_id="done")

    assert response.status_code == 200
    assert response.get_json()["users"] == []


# --- Edge cases -----------------------------------------------------------

class BrokenCollection(InMemoryProjectCollection):
    def update_one(self, query, update):
        raise PyMongoError("database down")


def test_database_error_returns_503():
    response = leave(make_app(projects=BrokenCollection(PROJECTS)).test_client())

    assert response.status_code == 503