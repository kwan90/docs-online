import { notFound } from "next/navigation";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../convex/_generated/api";
import { PublicDocument } from "./document";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

interface SharePageProps {
  params: Promise<{ token: string }>;
}

const SharePage = async ({ params }: SharePageProps) => {
  const { token } = await params;

  try {
    const document = await convex.query(api.documents.getByPublicToken, {
      publicToken: token,
    });

    if (!document) {
      notFound();
    }

    return (
      <PublicDocument
        document={document}
        publicToken={token}
        isEditable={document.publicAccessType === "edit"}
      />
    );
  } catch {
    notFound();
  }
};

export default SharePage;
