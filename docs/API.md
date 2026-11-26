# HardwareShare API

The Flask backend (`server/app.py`) serves JSON under these routes. The React
app calls them through `client/src/api/` (`hardwareApi.js`, `projectsApi.js`,
`usersApi.js`), which all go through `requestJson` in `client/src/api/client.js`.

- Request and response bodies are JSON.
- Every error response looks like `{ "error": "message for the user" }`.
  The frontend shows that message as is.
- `503` on any route means MongoDB could not be reached.

## Data shapes

**Project**
```json
{
  "projectName": "Robot Arm",
  "projectId": "robot-arm",
  "description": "Senior design project",
  "users": ["sydney", "alice"],
  "owner": "sydney",
  "hwSets": { "HWSet1": 3 }
}
```
- `hwSets` is how many units of each hardware set the project holds.
- `owner` is `null` for projects created before the owner rule.
- `projectId` must be 1-32 letters, numbers, `-` or `_`.

**Hardware set**
```json
{
  "name": "HWSet1",
  "capacity": 100,
  "available": 97,
  "description": "",
  "location": "",
  "specifications": {}
}
```

**User** (the password hash is never returned)
```json
{ "userId": "sydney", "username": "sydney", "projects": ["robot-arm"] }
```

## Accounts

| Method | Path | Body | Success | Errors |
|---|---|---|---|---|
| POST | `/add_user` | `userId`, `password`, `username` (optional) | `201 { user }` | 400 missing fields, 409 user ID taken |
| POST | `/login` | `userId`, `password` | `200 { user }` | 400 missing fields, 401 wrong ID or password |

## Projects

| Method | Path | Body | Success | Errors |
|---|---|---|---|---|
| POST | `/api/projects` | `projectName`, `projectId`, `description`, `userId` (creator) | `201` project | 400 bad input, 404 unknown user, 409 ID taken |
| GET | `/api/projects` | | `200 { projects }` (all projects) | |
| GET | `/api/projects/<projectId>` | | `200` project | 404 |
| GET | `/api/users/<userId>/projects` | | `200 { projects }` the user belongs to | 400, 404 unknown user |
| POST | `/api/projects/<projectId>/users` | `userId` | `200` project (join) | 400, 404, 409 already a member |
| DELETE | `/api/projects/<projectId>/users/<userId>` | | `200` project (leave) | 400, 404, 409 not a member / still holds hardware / is the owner |
| PUT | `/api/projects/<projectId>/owner` | `userId` (current owner), `newOwnerId` | `200` project | 400, 403 not the owner, 404, 409 new owner isn't a member |
| DELETE | `/api/projects/<projectId>` | `userId` (owner) | `200 { deleted: projectId }` | 400, 403 not the owner, 404, 409 hardware still checked out |

The creator of a project becomes its owner and first member. The owner can't
leave until they transfer ownership.

## Hardware

| Method | Path | Body | Success | Errors |
|---|---|---|---|---|
| GET | `/api/hardware` | | `200 { hardware }` | |
| GET | `/api/hardware/<name>` | | `200` hardware set | 404 |
| POST | `/api/hardware` | `name`, `capacity`, optional `description`, `location`, `specifications` | `201` hardware set | 400, 409 name taken |
| POST | `/api/projects/<projectId>/hardware/<name>/checkout` | `quantity`, `userId` | `200 { hardware, project }` | 400, 403 not a member, 404, 409 not enough available |
| POST | `/api/projects/<projectId>/hardware/<name>/checkin` | `quantity`, `userId` | `200 { hardware, project }` | 400, 403 not a member, 404, 409 more than the project holds |

Check out and check in update two collections (hardware and projects). If the
second update fails, the first one is undone, so inventory never goes missing.
See the docstrings on `check_out` and `check_in` in `server/app.py`.

## Other

| Method | Path | What it does |
|---|---|---|
| GET | `/api/health` | `200 { status: "ok", hardwareDataSource }`, or 503 if MongoDB doesn't answer |
| GET | any other path | Serves the built React app (`client/build`) so page refreshes work |

### Older aliases

These come from the course template and still work, but the frontend uses the
routes above:

- `POST /create_hardware_set`: same as `POST /api/hardware`. Also accepts
  `hwSetName` and `initCapacity`.
- `POST /check_out` and `POST /check_in`: same as the checkout and checkin
  routes, with `projectId` and `hardwareName` (or `hwSetName`) in the body.
  `qty` also works for `quantity`.

`/main`, `/join_project`, `/get_user_projects_list`, `/create_project`,
`/get_project_info`, `/get_all_hw_names`, `/get_hw_info` and `/api/inventory`
are unused stubs that return `{}`.

## Dummy mode

Without `MONGODB_URI`, hardware and projects use in-memory sample data
(`server/dummyHardwareData.py`, `server/dummyProjectData.py`), and
`/api/health` reports `"hardwareDataSource": "dummy"`. There is no user
collection in this mode, so `/login` and `/add_user` return 503. The other
routes skip their "does this user exist" check.
