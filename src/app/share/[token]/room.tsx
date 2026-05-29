"use client";

import { ReactNode } from "react";
import { LiveblocksProvider, RoomProvider, ClientSideSuspense } from "@liveblocks/react/suspense";
import { FullscreenLoader } from "@/components/fullscreen-loader";
import { Doc } from "../../../../convex/_generated/dataModel";

interface PublicRoomProps {
  children: ReactNode;
  documentId: string;
  publicToken: string;
  document: Doc<"documents">;
}

export function PublicRoom({ children, documentId, publicToken, document }: PublicRoomProps) {
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
      resolveUsers={() => {
        return [];
      }}
      resolveMentionSuggestions={() => {
        return [];
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
