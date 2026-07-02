import { getAuth } from "@/lib/auth-server";

export const dynamic = "force-dynamic";

async function handler(request: Request) {
  const auth = await getAuth();
  return auth.handler(request);
}

export { handler as GET, handler as POST };
