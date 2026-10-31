import { useEffect } from "react";
import { lmsAPI } from "../../services/api";

const KEY = "ff_lms_synced";

// Once per browser session, when the dashboard opens, ask the server to refresh from the LMS. The server decides
// whether it is due (and does nothing for a student who has not connected), so this is cheap.
export default function useLmsAutoSync() {
  useEffect(() => {
    try {
      if (!lmsAPI || !lmsAPI.sync || sessionStorage.getItem(KEY)) return;
      sessionStorage.setItem(KEY, "1");
      Promise.resolve(lmsAPI.sync()).catch(() => {});
    } catch (e) { /* storage blocked: skip */ }
  }, []);
}
