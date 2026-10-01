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

export async function fetchHardwareSets() {
  const payload = await requestJson("/api/hardware");
  return payload.hardware;
}

export async function fetchHardwareDetail(name) {
  return requestJson(`/api/hardware/${encodeURIComponent(name)}`);
}
