import Link from "next/link";
import { SearchBox } from "@/components/layout/search-box";

export default function NotFound() {
  return (
    <div className="container-x py-24 text-center">
      <p className="text-xs font-semibold uppercase tracking-wider text-3">404</p>
      <h1 className="mt-2 text-3xl font-semibold">We could not find that page</h1>
      <p className="mt-2 text-2">It may have moved. Try searching for what you need.</p>
      <div className="mx-auto mt-6 max-w-xl">
        <SearchBox size="lg" />
      </div>
      <p className="mt-6 text-sm text-3">
        Or go to <Link href="/" className="text-brand-700 underline dark:text-brand-300">the home page</Link>.
      </p>
    </div>
  );
}
