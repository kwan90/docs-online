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
  const user = await currentUser();
  const { room, publicToken } = await req.json();

  // Handle public token access (any user — authenticated or not)
  if (publicToken) {
    try {
      const document = await convex.query(api.documents.getByPublicToken, { publicToken });

      if (!document || document._id !== room) {
        return new Response("Unauthorized", { status: 401 });
      }

      // If user is authenticated, use their info; otherwise use anonymous
      const displayName = user?.fullName ?? user?.primaryEmailAddress?.emailAddress ?? "Anonymous";
      const sessionUserId = user?.id ?? `public-${publicToken}`;
      const nameToNumber = displayName.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
      const hue = Math.abs(nameToNumber) % 360;
      const color = `hsl(${hue}, 80%, 60%)`;

      const session = liveblocks.prepareSession(sessionUserId, {
        userInfo: {
          name: displayName,
          avatar: user?.imageUrl ?? "",
          color,
        },
      });

      // Grant read-only access for public view, full access for public edit
      const accessLevel = document.publicAccessType === "edit"
        ? session.FULL_ACCESS
        : session.READ_ACCESS;

      session.allow(room, accessLevel);
      const { body, status } = await session.authorize();

      return new Response(body, { status });
    } catch {
      return new Response("Unauthorized", { status: 401 });
    }
  }

  // Handle authenticated user access (owner / org member)
  if (!sessionClaims) {
    return new Response(JSON.stringify({ error: "Unauthorized: sessionClaims missing" }), { status: 401 });
  }

  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const document = await convex.query(api.documents.getById, { id: room });
  if (!document) {
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
