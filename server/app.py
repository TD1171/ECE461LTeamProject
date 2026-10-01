"""Flask application for user, project, and hardware APIs."""

import os
from pathlib import Path

from dotenv import load_dotenv
from flask import Flask, jsonify
from pymongo import MongoClient
from pymongo.errors import PyMongoError

try:
    from .dummyHardwareData import DUMMY_HARDWARE, InMemoryHardwareCollection
    from .hardwareDatabase import listHardwareSets, queryHardwareSet
except ImportError:  # Supports `python server/app.py` from the repository root.
    from dummyHardwareData import DUMMY_HARDWARE, InMemoryHardwareCollection
    from hardwareDatabase import listHardwareSets, queryHardwareSet


load_dotenv(Path(__file__).resolve().parents[1] / ".env")


def _build_hardware_collection(app):
    """Use MongoDB when configured; otherwise use temporary in-memory data."""
    if app.config["HARDWARE_DATA_SOURCE"] == "mongodb":
        if not app.config["MONGODB_URI"]:
            raise RuntimeError("MONGODB_URI is required when using MongoDB")

        client = MongoClient(
            app.config["MONGODB_URI"],
            serverSelectionTimeoutMS=2500,
        )
        collection = client[app.config["MONGODB_DATABASE"]][
            app.config["MONGODB_HARDWARE_COLLECTION"]
        ]
        return collection, client

    return InMemoryHardwareCollection(DUMMY_HARDWARE), None


def create_app(config=None, hardware_collection=None):
    """Create the Flask application with an injectable hardware collection."""
    app = Flask(__name__)
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
    )
    if config:
        app.config.update(config)

    mongo_client = None
    if hardware_collection is None:
        hardware_collection, mongo_client = _build_hardware_collection(app)

    app.extensions["hardware_collection"] = hardware_collection
    app.extensions["mongo_client"] = mongo_client

    @app.get("/api/health")
    def health_check():
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
        try:
            hardware = listHardwareSets(app.extensions["hardware_collection"])
        except PyMongoError:
            return jsonify({"error": "Hardware inventory is temporarily unavailable."}), 503
        return jsonify({"hardware": hardware})

    @app.get("/api/hardware/<string:hardware_name>")
    def get_hardware_detail(hardware_name):
        try:
            hardware = queryHardwareSet(
                app.extensions["hardware_collection"], hardware_name
            )
        except PyMongoError:
            return jsonify({"error": "Hardware inventory is temporarily unavailable."}), 503

        if hardware is None:
            return jsonify({"error": "Hardware set not found."}), 404
        return jsonify(hardware)

    # Existing team endpoints remain available for parallel development.
    @app.post("/login")
    def login():
        return jsonify({})

    @app.get("/main")
    def main_page():
        return jsonify({})

    @app.post("/join_project")
    def join_project():
        return jsonify({})

    @app.post("/add_user")
    def add_user():
        return jsonify({})

    @app.post("/get_user_projects_list")
    def get_user_projects_list():
        return jsonify({})

    @app.post("/create_project")
    def create_project():
        return jsonify({})

    @app.post("/get_project_info")
    def get_project_info():
        return jsonify({})

    @app.post("/get_all_hw_names")
    def get_all_hw_names():
        return jsonify({})

    @app.post("/get_hw_info")
    def get_hw_info():
        return jsonify({})

    @app.post("/check_out")
    def check_out():
        return jsonify({})

    @app.post("/check_in")
    def check_in():
        return jsonify({})

    @app.post("/create_hardware_set")
    def create_hardware_set():
        return jsonify({})

    @app.get("/api/inventory")
    def check_inventory():
        return jsonify({})

    return app


app = create_app()


if __name__ == "__main__":
    app.run(debug=True)
