import { Liveblocks } from "@liveblocks/node";
import { ConvexHttpClient } from "convex/browser";
import { auth, currentUser, clerkClient } from "@clerk/nextjs/server";
import { api } from "../../../../convex/_generated/api";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
const liveblocks = new Liveblocks({
  secret: process.env.LIVEBLOCKS_SECRET_KEY!,
});

export async function POST(req: Request) {
  const { sessionClaims, orgId } = await auth();

  if (!sessionClaims) {
    return new Response(JSON.stringify({ error: "Unauthorized: sessionClaims missing" }), { status: 401 });
  }

  const user = await currentUser();

  if (!user) {
    console.log('401 users');
    return new Response("Unauthorized", { status: 401 });
  }

  const { room } = await req.json();
  const document = await convex.query(api.documents.getById, { id: room });
  if (!document) {
    console.log('401 docs');
    return new Response("Unauthorized", { status: 401 });
  }

  const clerk = await clerkClient();
  const memberships = await clerk.users.getOrganizationMembershipList({
    userId: user.id,
  });
  const userOrgIds = memberships.data.map((m) => m.organization.id);

  const isOwner = document.ownerId === user.id;
  const currentOrgId = orgId || (sessionClaims as any)?.org_id || (sessionClaims as any)?.organization_id;
  const isOrganizationMember = !!(
    document.organizationId && 
    (document.organizationId === currentOrgId || userOrgIds.includes(document.organizationId))
  );

  if (!isOwner && !isOrganizationMember) {
    console.log('401 owner, orgsmember');
    return new Response("Unauthorized", { status: 401 });
  }

  const name = user.fullName ?? user.primaryEmailAddress?.emailAddress ?? "Anonymous";
  const nameToNumber = name.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const hue = Math.abs(nameToNumber) % 360;
  const color = `hsl(${hue}, 80%, 60%)`;

  const session = liveblocks.prepareSession(user.id, {
    userInfo: {
      name,
      avatar: user.imageUrl,
      color,
    },
  });
  session.allow(room, session.FULL_ACCESS);
  const { body, status } = await session.authorize();

  return new Response(body, { status });
}
