"""Flask serves the built React app (needed for the Heroku deploy)."""

from server.app import create_app
from server.dummyHardwareData import DUMMY_HARDWARE, InMemoryHardwareCollection


def make_client(build_dir):
    app = create_app(
        config={"TESTING": True, "CLIENT_BUILD_DIR": str(build_dir)},
        hardware_collection=InMemoryHardwareCollection(DUMMY_HARDWARE),
    )
    return app.test_client()


def make_build(tmp_path):
    (tmp_path / "static").mkdir()
    (tmp_path / "index.html").write_text("<div id='root'>react app</div>")
    (tmp_path / "static" / "main.js").write_text("console.log('hi')")
    return tmp_path


def test_root_serves_index_html(tmp_path):
    client = make_client(make_build(tmp_path))
    response = client.get("/")
    assert response.status_code == 200
    assert b"react app" in response.data


def test_react_page_refresh_serves_index_html(tmp_path):
    client = make_client(make_build(tmp_path))
    response = client.get("/projects/robot-arm")
    assert response.status_code == 200
    assert b"react app" in response.data


def test_built_files_are_served(tmp_path):
    client = make_client(make_build(tmp_path))
    response = client.get("/static/main.js")
    assert response.status_code == 200
    assert b"console.log" in response.data


def test_api_routes_still_work(tmp_path):
    client = make_client(make_build(tmp_path))
    response = client.get("/api/hardware")
    assert response.status_code == 200
    assert "hardware" in response.get_json()


def test_unknown_api_route_is_json_404(tmp_path):
    client = make_client(make_build(tmp_path))
    response = client.get("/api/nope")
    assert response.status_code == 404
    assert response.get_json() == {"error": "Not found."}


def test_missing_build_gives_clear_error(tmp_path):
    client = make_client(tmp_path)
    response = client.get("/")
    assert response.status_code == 404
    assert "npm run build" in response.get_json()["error"]