import { redirect } from "next/navigation";

/** The hub is the "all" list. */
export default function CommunityHub() {
  redirect("/community/all");
}
