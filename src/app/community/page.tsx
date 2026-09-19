import { permanentRedirect } from "next/navigation";

/** The hub is the "all" list. */
export default function CommunityHub() {
  permanentRedirect("/community/all");
}
