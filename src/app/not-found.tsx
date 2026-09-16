import Link from "next/link";
import { SearchBox } from "@/components/layout/search-box";

export default function NotFound() {
  return (
    <div className="container-x py-24 text-center">
      <p className="eyebrow">404</p>
      <h1 className="mt-2 font-display text-4xl">We could not find that page</h1>
      <p className="mt-2 text-2">It may have moved. Try searching for what you need.</p>
      <div className="mx-auto mt-6 max-w-xl">
        <SearchBox size="lg" />
      </div>
      <p className="mt-6 text-sm text-3">
        Or go to{" "}
        <Link href="/" className="underline underline-offset-4">
          the home page
        </Link>
        .
      </p>
    </div>
  );
}
