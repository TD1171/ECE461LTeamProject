"""Flask API for the hardware inventory page."""

import os

from flask import Flask, jsonify
from pymongo import MongoClient
from pymongo.errors import PyMongoError

try:
    from .dummyHardwareData import DUMMY_HARDWARE, InMemoryHardwareCollection
    from .hardwareDatabase import listHardwareSets, queryHardwareSet
except ImportError:  # Allows `python server/app.py` during local development.
    from dummyHardwareData import DUMMY_HARDWARE, InMemoryHardwareCollection
    from hardwareDatabase import listHardwareSets, queryHardwareSet


def _build_hardware_collection(app):
    """Choose dummy data by default, or MongoDB when the team is ready."""
    if app.config["HARDWARE_DATA_SOURCE"] == "mongodb":
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
    """Create the Flask app with an optionally injected data collection."""
    app = Flask(__name__)
    app.config.from_mapping(
        HARDWARE_DATA_SOURCE=os.getenv("HARDWARE_DATA_SOURCE", "dummy").lower(),
        MONGODB_URI=os.getenv("MONGODB_URI", "mongodb://localhost:27017"),
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
    def health():
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

    return app


app = create_app()


if __name__ == "__main__":
    app.run(debug=True)
