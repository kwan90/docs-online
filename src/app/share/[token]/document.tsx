"use client";

import Image from "next/image";
import Link from "next/link";
import { Doc } from "../../../../convex/_generated/dataModel";
import { PublicRoom } from "./room";
import { Editor } from "../../documents/[documentId]/editor";
import { Navbar } from "../../documents/[documentId]/navbar";
import { Toolbar } from "../../documents/[documentId]/toolbar";
import { Globe, Lock } from "lucide-react";

interface PublicDocumentProps {
  document: Doc<"documents">;
  publicToken: string;
  isEditable: boolean;
}

export const PublicDocument = ({ document, publicToken, isEditable }: PublicDocumentProps) => {
  return (
    <PublicRoom
      documentId={document._id}
      publicToken={publicToken}
      document={document}
    >
      <div className="min-h-screen bg-editor-bg">
        {/* Header */}
        {isEditable ? (
          <div className="flex flex-col px-4 pt-2 gap-y-2 fixed top-0 left-0 right-0 z-10 bg-[#FAFBFD] print:hidden h-[112px]">
            <Navbar data={document} hideShareButton={true} />
            <Toolbar />
          </div>
        ) : (
          <div className="flex items-center justify-between px-4 py-2 fixed top-0 left-0 right-0 z-10 bg-[#FAFBFD] border-b print:hidden">
            <div className="flex items-center gap-2">
              <Link href="/">
                <Image src="/logo.svg" alt="logo" width={32} height={32} />
              </Link>
              <div className="flex flex-col">
                <h1 className="text-sm font-medium">{document.title}</h1>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Lock className="size-3" />
                  <span>Anyone with the link can view</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Editor */}
        <div className={isEditable ? "pt-[114px] print:pt-0" : "pt-[72px] print:pt-0"}>
          <Editor initialContent={document.initialContent} />
        </div>
      </div>
    </PublicRoom>
  );
};
