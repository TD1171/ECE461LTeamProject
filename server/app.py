"""Flask application for user, project, and hardware APIs."""

import os
from pathlib import Path

from dotenv import load_dotenv
from flask import Flask, jsonify, request, send_from_directory
from pymongo import MongoClient
from pymongo.errors import DuplicateKeyError, PyMongoError



try:
    from .dummyHardwareData import DUMMY_HARDWARE, InMemoryHardwareCollection
    from .dummyProjectData import DUMMY_PROJECTS, InMemoryProjectCollection
    from .hardwareDatabase import (
        HardwareExistsError,
        createHardwareSet,
        listHardwareSets,
        queryHardwareSet,
        requestSpace,
        returnSpace,
    )
    from .projectsDatabase import (
        AlreadyMemberError,
        ProjectExistsError,
        ProjectNotFoundError,
        NotMemberError,
        HardwareStillCheckedOutError,
        OwnerCannotLeaveError,
        deleteProject as deleteProjectRecord,
        transferOwnership,
        NotOwnerError,
        addUser as addUserToProject,
        removeUser as removeUserFromProject,
        createProject,
        listProjects,
        listUserProjects,
        queryProject,
        checkOutHW,
        checkInHW,
        HardwareRequestError,
    )
    from .usersDatabase import addUser, joinProject, login as loginUser, userExists, leaveProject
except ImportError:  # Supports `python server/app.py` from the repository root.
    from dummyHardwareData import DUMMY_HARDWARE, InMemoryHardwareCollection
    from dummyProjectData import DUMMY_PROJECTS, InMemoryProjectCollection
    from hardwareDatabase import (
        HardwareExistsError,
        createHardwareSet,
        listHardwareSets,
        queryHardwareSet,
        requestSpace,
        returnSpace,
    )
    from projectsDatabase import (
        AlreadyMemberError,
        ProjectExistsError,
        ProjectNotFoundError,
        NotMemberError,
        HardwareStillCheckedOutError,
        OwnerCannotLeaveError,
        deleteProject as deleteProjectRecord,
        transferOwnership,
        NotOwnerError,
        addUser as addUserToProject,
        removeUser as removeUserFromProject,
        createProject,
        listProjects,
        listUserProjects,
        queryProject,
        checkOutHW,
        checkInHW,
        HardwareRequestError,
    )
    from usersDatabase import addUser, joinProject, login as loginUser, userExists, leaveProject


load_dotenv(Path(__file__).resolve().parents[1] / ".env")

# Where `npm run build` puts the React app. On Heroku, Flask serves these
# files so the whole app runs from one URL.
CLIENT_BUILD_DIR = Path(__file__).resolve().parents[1] / "client" / "build"


def _build_hardware_collection(app):
    """Use MongoDB when configured; otherwise use temporary in-memory data."""
    if app.config["HARDWARE_DATA_SOURCE"] == "mongodb":
        if not app.config["MONGODB_URI"]:
            raise RuntimeError("MONGODB_URI is required when using MongoDB")

        client = MongoClient(
            app.config["MONGODB_URI"],
            serverSelectionTimeoutMS=10000,
        )
        collection = client[app.config["MONGODB_DATABASE"]][
            app.config["MONGODB_HARDWARE_COLLECTION"]
        ]
        try:
            collection.create_index("hwName", unique=True)
        except PyMongoError:
            app.logger.warning("Could not ensure unique index on hwName.")
        return collection, client

    return InMemoryHardwareCollection(DUMMY_HARDWARE), None

def _build_projects_collection(app, mongo_client):
    """Share the hardware MongoDB client when configured; else use memory."""
    if mongo_client is None:
        return InMemoryProjectCollection(DUMMY_PROJECTS)

    collection = mongo_client[app.config["MONGODB_DATABASE"]][
        app.config["MONGODB_PROJECTS_COLLECTION"]
    ]
    try:
        # Enforces unique project IDs even if two requests race.
        collection.create_index("projectId", unique=True)
    except PyMongoError:
        app.logger.warning("Could not ensure unique index on projectId.")
    return collection


def _build_user_collection(app, mongo_client):
    """Create the user collection and enforce unique user IDs."""
    if mongo_client is None:
        return None

    collection = mongo_client[app.config["MONGODB_DATABASE"]][
        app.config["MONGODB_USER_COLLECTION"]
    ]
    try:
        collection.create_index("userId", unique=True)
    except PyMongoError:
        app.logger.warning("Could not ensure unique index on userId.")
    return collection

def create_app(
    config=None,
    hardware_collection=None,
    projects_collection=None,
    user_collection=None,
):
    """Create the Flask application with an injectable hardware collection."""
    # static_folder=None: serve_react_app below handles the built files.
    app = Flask(__name__, static_folder=None)
    default_source = "mongodb" if os.getenv("MONGODB_URI") else "dummy"
    app.config.from_mapping(
        HARDWARE_DATA_SOURCE=os.getenv(
            "HARDWARE_DATA_SOURCE", default_source
        ).lower(),
        MONGODB_URI=os.getenv("MONGODB_URI", ""),
        MONGODB_DATABASE=os.getenv("MONGODB_DATABASE", "HardwareCheckout"),
        MONGODB_HARDWARE_COLLECTION=os.getenv(
            "MONGODB_HARDWARE_COLLECTION", "HardwareSets"
        ),
        MONGODB_PROJECTS_COLLECTION=os.getenv(
            "MONGODB_PROJECTS_COLLECTION", "Projects"
        ),
        MONGODB_USER_COLLECTION=os.getenv("MONGODB_USER_COLLECTION", "Users"),
        CLIENT_BUILD_DIR=str(CLIENT_BUILD_DIR),
    )
    if config:
        app.config.update(config)

    mongo_client = None
    if hardware_collection is None:
        hardware_collection, mongo_client = _build_hardware_collection(app)

    if projects_collection is None:
        projects_collection = _build_projects_collection(app, mongo_client)

    if user_collection is None:
        user_collection = _build_user_collection(app, mongo_client)

    app.extensions["hardware_collection"] = hardware_collection
    app.extensions["projects_collection"] = projects_collection
    app.extensions["mongo_client"] = mongo_client

    app.extensions["user_collection"] = user_collection
    

    @app.get("/api/health")
    def health_check():
        """Report whether the server (and MongoDB, if used) is reachable.

        200 with the data source ("mongodb" or "dummy"), or 503 if the
        database does not answer a ping.
        """
        if mongo_client is not None:
            try:
                mongo_client.admin.command("ping")
            except PyMongoError:
                return jsonify({"status": "error", "database": "unavailable"}), 503
        return jsonify(
            {
                "status": "ok",
                "hardwareDataSource": app.config["HARDWARE_DATA_SOURCE"],
            }
        )

    @app.get("/api/hardware")
    def get_hardware():
        """List every hardware set with its capacity and availability."""
        try:
            hardware = listHardwareSets(app.extensions["hardware_collection"])
        except PyMongoError:
            return jsonify({"error": "Hardware inventory is temporarily unavailable."}), 503
        return jsonify({"hardware": hardware})

    @app.get("/api/hardware/<string:hardware_name>")
    def get_hardware_detail(hardware_name):
        """Return one hardware set by name, or 404 if it doesn't exist."""
        try:
            hardware = queryHardwareSet(
                app.extensions["hardware_collection"], hardware_name
            )
        except PyMongoError:
            return jsonify({"error": "Hardware inventory is temporarily unavailable."}), 503

        if hardware is None:
            return jsonify({"error": "Hardware set not found."}), 404
        return jsonify(hardware)

    @app.post("/api/hardware")
    @app.post("/create_hardware_set")
    def create_hardware_api():
        """Create a hardware set. 201 on success, 400 bad input, 409 duplicate.

        Accepts both the new keys (name, capacity) and the template's keys
        (hwSetName, initCapacity), which is also why the old
        /create_hardware_set path is kept as an alias.
        """
        payload = request.get_json(silent=True)
        if not isinstance(payload, dict):
            return jsonify({"error": "Request body must be a JSON object."}), 400

        name = payload.get("name", payload.get("hwSetName"))
        capacity = payload.get("capacity", payload.get("initCapacity"))
        details = {
            key: payload[key]
            for key in ("description", "location", "specifications")
            if key in payload
        }

        try:
            hardware = createHardwareSet(
                app.extensions["hardware_collection"], name, capacity, **details
            )
        except ValueError as error:
            return jsonify({"error": str(error)}), 400
        except HardwareExistsError as error:
            return jsonify({"error": str(error)}), 409
        except DuplicateKeyError:
            return jsonify({"error": f"Hardware set '{name}' already exists."}), 409
        except PyMongoError:
            return jsonify({"error": "Hardware inventory is temporarily unavailable."}), 503

        return jsonify(hardware), 201

    @app.post("/api/projects")
    def create_project_api():
        """Create a project; the creator becomes its owner and first member.

        Body: projectName, projectId, description (optional), userId.
        201 with the project, 400 bad input, 404 unknown user,
        409 projectId already taken.
        """
        payload = request.get_json(silent=True)
        if not isinstance(payload, dict):
            return jsonify({"error": "Request body must be a JSON object."}), 400

        # The creator automatically becomes the project's first member.
        # TODO: take the creator from the signed-in session once Sign In (#2)
        # lands, instead of trusting the request body.
        creator_id = payload.get("userId")
        if not isinstance(creator_id, str) or not creator_id.strip():
            return jsonify({"error": "User ID is required."}), 400
        creator_id = creator_id.strip()

        user_collection = app.extensions["user_collection"]
        try:
            # Check the user first so we never create a project with no
            # real owner. Dummy mode has no user collection, so skip it there.
            if user_collection is not None and not userExists(
                user_collection, creator_id
            ):
                return jsonify({"error": f"User '{creator_id}' was not found."}), 404

            project = createProject(
                app.extensions["projects_collection"],
                payload.get("projectName"),
                payload.get("projectId"),
                payload.get("description", ""),
                creatorId=creator_id,
            )

            # Keep the user's side in sync, same as joining a project.
            if user_collection is not None:
                joinProject(user_collection, creator_id, project["projectId"])

        except ValueError as error:
            return jsonify({"error": str(error)}), 400
        except ProjectExistsError as error:
            return jsonify({"error": str(error)}), 409
        except PyMongoError:
            return jsonify({"error": "Projects are temporarily unavailable."}), 503

        return jsonify(project), 201

    @app.get("/api/projects")
    def get_projects_api():
        """List all projects (not filtered by user)."""
        try:
            projects = listProjects(app.extensions["projects_collection"])
        except PyMongoError:
            return jsonify({"error": "Projects are temporarily unavailable."}), 503
        return jsonify({"projects": projects}), 200

    @app.get("/api/projects/<string:project_id>")
    def get_project_api(project_id):
        """Return one project by ID, or 404 if it doesn't exist."""
        try:
            project = queryProject(app.extensions["projects_collection"], project_id)
        except PyMongoError:
            return jsonify({"error": "Projects are temporarily unavailable."}), 503

        if project is None:
            return jsonify({"error": "Project not found."}), 404
        return jsonify(project)

    @app.post("/api/projects/<string:project_id>/users")
    def add_user_to_project_api(project_id):
        """Add a user to a project (issue #5: Join a Project)."""
        payload = request.get_json(silent=True)
        if not isinstance(payload, dict):
            return jsonify({"error": "Request body must be a JSON object."}), 400

        # TODO: take the user from the signed-in session once Sign In (#2)
        # lands, instead of trusting the request body.
        user_id = payload.get("userId")
        if not isinstance(user_id, str) or not user_id.strip():
            return jsonify({"error": "User ID is required."}), 400
        user_id = user_id.strip()

        user_collection = app.extensions["user_collection"]
        try:
            # Without MongoDB there is no user collection, so local dummy
            # mode skips the "is this a real user" check.
            if user_collection is not None and not userExists(
                user_collection, user_id
            ):
                return jsonify({"error": f"User '{user_id}' was not found."}), 404

            project = addUserToProject(
                app.extensions["projects_collection"], project_id, user_id
            )

            if user_collection is not None:
                joinProject(user_collection, user_id, project["projectId"])
        except ValueError as error:
            return jsonify({"error": str(error)}), 400
        except ProjectNotFoundError as error:
            return jsonify({"error": str(error)}), 404
        except AlreadyMemberError as error:
            return jsonify({"error": str(error)}), 409
        except PyMongoError:
            return jsonify({"error": "Projects are temporarily unavailable."}), 503

        return jsonify(project), 200

    @app.delete("/api/projects/<string:project_id>/users/<string:user_id>")
    def remove_user_from_project_api(project_id, user_id):
        """Remove a user from a project (issue #9: Leave a Project)."""
        user_id = user_id.strip()
        if not user_id:
            return jsonify({"error": "User ID is required."}), 400

        user_collection = app.extensions["user_collection"]
        try:
            if user_collection is not None and not userExists(user_collection, user_id):
                return jsonify({"error": f"User '{user_id}' was not found."}), 404
            project = removeUserFromProject(
                app.extensions["projects_collection"], project_id, user_id
            )
            if user_collection is not None:
                leaveProject(user_collection, user_id, project["projectId"])
        except ValueError as error:
            return jsonify({"error": str(error)}), 400
        except ProjectNotFoundError as error:
            return jsonify({"error": str(error)}), 404
        except (NotMemberError, HardwareStillCheckedOutError, OwnerCannotLeaveError) as error:
            return jsonify({"error": str(error)}), 409
        except PyMongoError:
            return jsonify({"error": "Projects are temporarily unavailable."}), 503
        return jsonify(project), 200

    @app.put("/api/projects/<string:project_id>/owner")
    def transfer_ownership_api(project_id):
        """Owner hands ownership to another member: {userId, newOwnerId}."""
        payload = request.get_json(silent=True)
        if not isinstance(payload, dict):
            return jsonify({"error": "Request body must be a JSON object."}), 400
        try:
            project = transferOwnership(
                app.extensions["projects_collection"],
                project_id,
                payload.get("userId"),
                payload.get("newOwnerId"),
            )
        except ValueError as error:
            return jsonify({"error": str(error)}), 400
        except ProjectNotFoundError as error:
            return jsonify({"error": str(error)}), 404
        except NotOwnerError as error:
            return jsonify({"error": str(error)}), 403
        except NotMemberError as error:
            return jsonify({"error": str(error)}), 409
        except PyMongoError:
            return jsonify({"error": "Projects are temporarily unavailable."}), 503
        return jsonify(project), 200

    @app.delete("/api/projects/<string:project_id>")
    def delete_project_api(project_id):
        """Owner deletes the project once nothing is checked out: {userId}."""
        payload = request.get_json(silent=True)
        if not isinstance(payload, dict):
            return jsonify({"error": "Request body must be a JSON object."}), 400
        try:
            project = deleteProjectRecord(
                app.extensions["projects_collection"], project_id, payload.get("userId")
            )
            # Keep every member's own project list in sync.
            user_collection = app.extensions["user_collection"]
            if user_collection is not None:
                user_collection.update_many(
                    {"projects": project["projectId"]},
                    {"$pull": {"projects": project["projectId"]}},
                )
        except ValueError as error:
            return jsonify({"error": str(error)}), 400
        except ProjectNotFoundError as error:
            return jsonify({"error": str(error)}), 404
        except NotOwnerError as error:
            return jsonify({"error": str(error)}), 403
        except HardwareStillCheckedOutError as error:
            return jsonify({"error": str(error)}), 409
        except PyMongoError:
            return jsonify({"error": "Projects are temporarily unavailable."}), 503
        return jsonify({"deleted": project["projectId"]}), 200

    # Existing team endpoints remain available for parallel development.
    @app.get("/api/users/<string:user_id>/projects")
    def get_user_projects_api(user_id):
        """List every project a user belongs to (issue #6: View My Projects)."""
        # TODO: take the user from the signed-in session once Sign In (#2)
        # lands, instead of trusting the URL.
        user_id = user_id.strip()
        if not user_id:
            return jsonify({"error": "User ID is required."}), 400

        user_collection = app.extensions["user_collection"]
        try:
            # Dummy mode has no user collection, so skip the check there.
            if user_collection is not None and not userExists(
                user_collection, user_id
            ):
                return jsonify({"error": f"User '{user_id}' was not found."}), 404

            projects = listUserProjects(
                app.extensions["projects_collection"], user_id
            )
        except ValueError as error:
            return jsonify({"error": str(error)}), 400
        except PyMongoError:
            return jsonify({"error": "Projects are temporarily unavailable."}), 503

        return jsonify({"projects": projects}), 200

    
    # Existing team endpoints remain available for parallel development.
    @app.post("/login")
    def login():
        """Sign in with userId and password.

        200 with the user (never the password hash), 400 missing fields,
        401 wrong ID or password, 503 if the user database is unavailable.
        """
        data = request.get_json(silent=True) or {}

        user_id = str(data.get("userId", "")).strip()
        password = data.get("password", "")

        if not user_id or not password:
            return jsonify({
                "error": "User ID and password are required."
            }), 400

        user_collection = app.extensions["user_collection"]

        if user_collection is None:
            return jsonify({
                "error": "User database is unavailable."
            }), 503

        try:
            user = loginUser(
                user_collection,
                user_id,
                password,
            )
        except PyMongoError:
            return jsonify({
                "error": "User database is temporarily unavailable."
            }), 503

        if user is None:
            return jsonify({
                "error": "Invalid user ID or password."
            }), 401

        return jsonify({"user": user}), 200

    # --- Unused template stubs -------------------------------------------
    # The routes below come from the course template and just return {}.
    # The frontend does not call them; the real endpoints are listed next to
    # each one. They are kept for now so nothing that might call them breaks.

    @app.get("/main")
    def main_page():
        """Unused stub. The dashboard uses GET /api/users/<id>/projects."""
        return jsonify({})

    @app.post("/join_project")
    def join_project():
        """Unused stub. Real endpoint: POST /api/projects/<id>/users."""
        return jsonify({})

    @app.post("/add_user")
    def add_user():
        """Create an account (used by the Create Account page).

        Body: userId, password, username (optional, defaults to userId).
        201 with the new user, 400 missing fields, 409 userId taken.
        """
        data = request.get_json(silent=True) or {}

        user_id = str(data.get("userId", "")).strip()
        password = data.get("password", "")
        username = str(data.get("username") or user_id).strip()

        if not user_id or not password:
            return jsonify({
                "error": "User ID and password are required."
            }), 400

        user_collection = app.extensions["user_collection"]

        if user_collection is None:
            return jsonify({
                "error": "User database is unavailable."
            }), 503

        try:
            user = addUser(
                user_collection,
                username,
                user_id,
                password,
            )
        except DuplicateKeyError:
            return jsonify({"error": "User ID already exists."}), 409
        except PyMongoError:
            return jsonify({
                "error": "User database is temporarily unavailable."
            }), 503

        if user is None:
            return jsonify({
                "error": "User ID already exists."
            }), 409

        return jsonify({"user": user}), 201

    @app.post("/get_user_projects_list")
    def get_user_projects_list():
        """Unused stub. Real endpoint: GET /api/users/<id>/projects."""
        return jsonify({})

    @app.post("/create_project")
    def create_project():
        """Unused stub. Real endpoint: POST /api/projects."""
        return jsonify({})

    @app.post("/get_project_info")
    def get_project_info():
        """Unused stub. Real endpoint: GET /api/projects/<id>."""
        return jsonify({})

    @app.post("/get_all_hw_names")
    def get_all_hw_names():
        """Unused stub. Real endpoint: GET /api/hardware."""
        return jsonify({})

    @app.post("/get_hw_info")
    def get_hw_info():
        """Unused stub. Real endpoint: GET /api/hardware/<name>."""
        return jsonify({})

    def _membership_error(project_id, user_id):
        """Return an error response unless user_id is a member of project_id.

        Test case 17: only a project's members may check its hardware out or
        in. This runs before any inventory changes, so a rejected request
        changes nothing.
        """
        if not isinstance(user_id, str) or not user_id.strip():
            return jsonify({"error": "User ID is required."}), 400
        project = queryProject(app.extensions["projects_collection"], project_id)
        if project is None:
            return jsonify({"error": f"Project '{project_id}' was not found."}), 404
        if user_id.strip() not in project["users"]:
            return jsonify({"error": "Only members of this project can check hardware out or in."}), 403
        return None

    @app.post("/check_out")
    @app.post("/api/projects/<string:project_id>/hardware/<string:hardware_name>/checkout")
    def check_out(project_id=None, hardware_name=None):
        """Check hardware out to a project.

        Two paths reach this: the REST-style URL the frontend uses, and the
        template's /check_out, which takes projectId and hardwareName (or
        hwSetName) in the body instead. quantity may also be sent as qty.

        Order matters because hardware and projects are separate collections:
          1. Only project members may check out (_membership_error).
          2. Take the units from the hardware set (fails with 409 if not
             enough are available).
          3. Record them on the project. If that fails, give the units back
             so inventory is never lost.
        """
        payload = request.get_json(silent=True)
        if not isinstance(payload, dict):
            return jsonify({"error": "Request body must be a JSON object."}), 400

        hardware_name = hardware_name or payload.get("hardwareName", payload.get("hwSetName"))
        project_id = project_id or payload.get("projectId")
        quantity = payload.get("quantity", payload.get("qty"))
        if not isinstance(project_id, str) or not project_id.strip():
            return jsonify({"error": "Project ID is required."}), 400
        if not isinstance(hardware_name, str) or not hardware_name.strip():
            return jsonify({"error": "Hardware name is required."}), 400

        try:
            denied = _membership_error(project_id.strip(), payload.get("userId"))
            if denied:
                return denied
            hardware = requestSpace(app.extensions["hardware_collection"], hardware_name.strip(), quantity)
            if hardware is None:
                return jsonify({"error": "Not enough hardware is available."}), 409
            try:
                project = checkOutHW(app.extensions["projects_collection"], project_id.strip(), hardware_name.strip(), quantity, None)
            except ProjectNotFoundError:
                # Give the units back so inventory isn't lost.
                returnSpace(app.extensions["hardware_collection"], hardware_name.strip(), quantity)
                raise
        except ValueError as error:
            return jsonify({"error": str(error)}), 400
        except ProjectNotFoundError as error:
            return jsonify({"error": str(error)}), 404
        except PyMongoError:
            return jsonify({"error": "Hardware inventory is temporarily unavailable."}), 503
        return jsonify({"hardware": hardware, "project": project}), 200

    @app.post("/check_in")
    @app.post("/api/projects/<string:project_id>/hardware/<string:hardware_name>/checkin")
    def check_in(project_id=None, hardware_name=None):
        """Return hardware from a project. Mirror image of check_out.

          1. Only project members may check in.
          2. Put the units back on the hardware set (409 if that would go
             over capacity).
          3. Remove them from the project. If the project doesn't hold that
             many (HardwareRequestError) or doesn't exist, take the units
             back off the hardware set so the two collections stay in sync.
        """
        payload = request.get_json(silent=True)
        if not isinstance(payload, dict):
            return jsonify({"error": "Request body must be a JSON object."}), 400
        project_id = project_id or payload.get("projectId")
        hardware_name = hardware_name or payload.get("hardwareName", payload.get("hwSetName"))
        quantity = payload.get("quantity", payload.get("qty"))
        if not project_id or not hardware_name:
            return jsonify({"error": "Project ID and hardware name are required."}), 400
        try:
            denied = _membership_error(project_id, payload.get("userId"))
            if denied:
                return denied
            hardware = returnSpace(app.extensions["hardware_collection"], hardware_name, quantity)
            if hardware is None:
                return jsonify({"error": "Hardware set not found or capacity exceeded."}), 409
            try:
                project = checkInHW(app.extensions["projects_collection"], project_id, hardware_name, quantity, None)
            except (ProjectNotFoundError, HardwareRequestError):
                # Restore the inventory count if the project cannot accept the return.
                requestSpace(app.extensions["hardware_collection"], hardware_name, quantity)
                raise
        except ValueError as error:
            return jsonify({"error": str(error)}), 400
        except ProjectNotFoundError as error:
            return jsonify({"error": str(error)}), 404
        except HardwareRequestError as error:
            return jsonify({"error": str(error)}), 409
        except PyMongoError:
            return jsonify({"error": "Hardware inventory is temporarily unavailable."}), 503
        return jsonify({"hardware": hardware, "project": project}), 200

    @app.get("/api/inventory")
    def check_inventory():
        """Unused stub. Use GET /api/hardware for inventory."""
        return jsonify({})

    # Serve the React app for every other GET. Real files (JS, CSS, images)
    # are sent as-is; anything else gets index.html so React Router can show
    # the right page, e.g. refreshing on /projects/robot-arm.
    @app.get("/", defaults={"path": ""})
    @app.get("/<path:path>")
    def serve_react_app(path):
        if path.startswith("api/"):
            return jsonify({"error": "Not found."}), 404

        build_dir = Path(app.config["CLIENT_BUILD_DIR"])
        if path and (build_dir / path).is_file():
            return send_from_directory(build_dir, path)
        if (build_dir / "index.html").is_file():
            return send_from_directory(build_dir, "index.html")
        return jsonify({"error": "Frontend has not been built. Run npm run build in client/."}), 404

    return app


app = create_app()


if __name__ == "__main__":
    app.run(debug=True)