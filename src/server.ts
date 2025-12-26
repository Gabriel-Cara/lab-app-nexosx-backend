import { app } from "./app";
import { env } from "./env";
import { syncDelayedPackages } from "./services/package-status-service";

const PORT = env.PORT;
const PACKAGE_SYNC_INTERVAL_MS = 60 * 60 * 1000;

async function runPackageStatusSync() {
  try {
    await syncDelayedPackages();
  } catch (error) {
    console.error("[packages] Failed to sync delayed packages", error);
  }
}

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  void runPackageStatusSync();
  setInterval(() => {
    void runPackageStatusSync();
  }, PACKAGE_SYNC_INTERVAL_MS);
});
