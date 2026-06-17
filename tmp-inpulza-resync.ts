import { syncService } from "./server/services/syncService";
const BRAND_ID = "72307812-2edb-43a6-884b-e19f1a9cf200";
(async () => {
  try {
    const res = await syncService.syncBrandById(BRAND_ID);
    console.log("[RESYNC] Result:", JSON.stringify(res));
  } catch (e) {
    console.error("[RESYNC] Error:", e && e.message ? e.message : e);
  } finally {
    process.exit(0);
  }
})();
