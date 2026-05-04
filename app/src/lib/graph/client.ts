import "server-only";
import "isomorphic-fetch";
import { Client } from "@microsoft/microsoft-graph-client";
import { getAccessToken } from "./auth";

let cachedClient: Client | null = null;

export function getGraphClient(): Client {
  if (cachedClient) return cachedClient;
  cachedClient = Client.init({
    authProvider: async (done) => {
      try {
        const token = await getAccessToken();
        done(null, token);
      } catch (err) {
        done(err as Error, null);
      }
    },
  });
  return cachedClient;
}

export function resetGraphClientForTests() {
  cachedClient = null;
}
