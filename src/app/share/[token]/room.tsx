"use client";

import { ReactNode, useMemo, useState, useEffect } from "react";
import { LiveblocksProvider, RoomProvider, ClientSideSuspense } from "@liveblocks/react/suspense";
import { FullscreenLoader } from "@/components/fullscreen-loader";
import { Doc } from "../../../../convex/_generated/dataModel";

type User = { id: string; name: string; avatar: string; color: string; };

interface PublicRoomProps {
  children: ReactNode;
  documentId: string;
  publicToken: string;
  document: Doc<"documents">;
}

export function PublicRoom({ children, documentId, publicToken, document }: PublicRoomProps) {
  const [users, setUsers] = useState<User[]>([]);

  return (
    <LiveblocksProvider
      throttle={16}
      authEndpoint={async () => {
        const endpoint = "/api/liveblocks-auth";
        const room = documentId;

        const response = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ room, publicToken }),
        });

        if (!response.ok) {
          throw new Error("Unauthorized");
        }

        return await response.json();
      }}
      resolveUsers={({ userIds }) => {
        return userIds.map((userId) => users.find((user) => user.id === userId) ?? undefined);
      }}
      resolveMentionSuggestions={({ text }) => {
        let filteredUsers = users;

        if (text) {
          filteredUsers = users.filter((user) =>
            user.name.toLowerCase().includes(text.toLowerCase())
          );
        }

        return filteredUsers.map((user) => user.id);
      }}
      resolveRoomsInfo={async ({ roomIds }) => {
        return roomIds.map((id) => ({
          id,
          name: document.title,
        }));
      }}
    >
      <RoomProvider
        id={documentId}
        initialStorage={{ leftMargin: 112, rightMargin: 112 }}
      >
        <ClientSideSuspense fallback={<FullscreenLoader label="Loading document..." />}>
          {children}
        </ClientSideSuspense>
      </RoomProvider>
    </LiveblocksProvider>
  );
}
