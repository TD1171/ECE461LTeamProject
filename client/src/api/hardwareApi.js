async function requestJson(path) {
  const response = await fetch(path, {
    headers: { Accept: "application/json" },
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || "Unable to load hardware information.");
  }

  return payload;
}

async function postHardwareAction(path, body) {
  const response = await fetch(path, {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || "Hardware request failed.");
  return payload;
}

export function checkoutHardware(projectId, hardwareName, quantity) {
  return postHardwareAction("/check_out", { projectId, hardwareName, quantity });
}

export function checkinHardware(projectId, hardwareName, quantity) {
  return postHardwareAction("/check_in", { projectId, hardwareName, quantity });
}

export async function fetchHardwareSets() {
  const payload = await requestJson("/api/hardware");
  return payload.hardware;
}

export async function fetchHardwareDetail(name) {
  return requestJson(`/api/hardware/${encodeURIComponent(name)}`);
}
