import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// Default config: no incremental cache (all dashboard pages are force-dynamic;
// at ≤5 users there is nothing worth ISR-caching). Revisit if we add public pages.
export default defineCloudflareConfig();
