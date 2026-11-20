// Hardware-set API calls. Request/response handling lives in ./client.
import { requestJson } from "./client";
import { getSignedInUserId } from "../session";

const LOAD_ERROR = "Unable to load hardware information.";
const ACTION_ERROR = "Hardware request failed.";

// The server only lets project members check hardware out or in, so every
// request says who is asking.
export function checkoutHardware(projectId, hardwareName, quantity) {
  return requestJson("/check_out", {
    method: "POST",
    body: { projectId, hardwareName, quantity, userId: getSignedInUserId() },
    errorMessage: ACTION_ERROR,
  });
}

export function checkinHardware(projectId, hardwareName, quantity) {
  return requestJson("/check_in", {
    method: "POST",
    body: { projectId, hardwareName, quantity, userId: getSignedInUserId() },
    errorMessage: ACTION_ERROR,
  });
}

export async function fetchHardwareSets() {
  const payload = await requestJson("/api/hardware", { errorMessage: LOAD_ERROR });
  return payload.hardware;
}

export function fetchHardwareDetail(name) {
  return requestJson(`/api/hardware/${encodeURIComponent(name)}`, {
    errorMessage: LOAD_ERROR,
  });
}