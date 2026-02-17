import Link from "next/link";
import { getSortedPostsData } from "@/lib/posts";

const POSTS_PER_PAGE = 3;

export default async function BlogIndex({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page } = await searchParams;

  const allPosts = getSortedPostsData();
  const totalPosts = allPosts.length;
  const totalPages = Math.max(1, Math.ceil(totalPosts / POSTS_PER_PAGE));

  const currentPage = Math.min(
    totalPages,
    Math.max(1, Number(page ?? "1"))
  );

  const startIndex = (currentPage - 1) * POSTS_PER_PAGE;
  const paginatedPosts = allPosts.slice(
    startIndex,
    startIndex + POSTS_PER_PAGE
  );

  return (
    <div className="min-h-screen grid-bg flex flex-col">
      {/* HEADER */}
      <header className="border-b border-white/20 p-4 flex justify-between items-center bg-black sticky top-0 z-50">
        <Link
          href="/"
          className="font-bold tracking-widest text-xl hover:text-gray-400 transition-colors"
        >
          EQUALIS_V1
        </Link>
        <div className="text-sm uppercase tracking-widest text-gray-500">
          // TRANSMISSION_LOG
        </div>
      </header>

      {/* CONTENT WRAPPER (fills space, but inner main stays natural height) */}
      <div className="flex-1 flex flex-col">
        {/* MAIN LIST */}
        <main className="max-w-4xl mx-auto w-full border-x border-white/20 bg-black flex flex-col mt-8 md:mt-12">
        <div className="border-y border-white/20 divide-y divide-white/20">
          {paginatedPosts.map((post) => (
            <article key={post.slug} className="group relative">
              <Link
                href={`/blog/${post.slug}`}
                className="block p-8 md:p-12 hover:bg-white/5 transition-colors"
              >
                <div className="flex flex-col md:flex-row gap-6 md:items-baseline mb-4">
                  <span className="font-mono text-xs text-gray-500 border border-gray-800 px-2 py-1">
                    LOG::{post.date}
                  </span>
                  <h2 className="text-2xl md:text-3xl font-bold uppercase tracking-tight group-hover:underline decoration-2 underline-offset-4">
                    {post.title}
                  </h2>
                </div>
                <p className="text-gray-400 font-mono text-sm leading-relaxed max-w-2xl">
                  {post.excerpt}
                </p>
              </Link>
            </article>
          ))}
        </div>

        {/* PAGINATION CONTROLS */}
        {totalPages > 1 && (
          <nav className="border-y border-white/20 bg-black px-4 py-3 flex items-center justify-between text-xs font-mono uppercase tracking-widest text-gray-400">
            <div>
              PAGE {currentPage} / {totalPages}
            </div>
            <div className="flex gap-4">
              {currentPage > 1 && (
                <Link
                  href={`/blog?page=${currentPage - 1}`}
                  className="hover:text-white"
                >
                  &lt; PREV
                </Link>
              )}
              {currentPage < totalPages && (
                <Link
                  href={`/blog?page=${currentPage + 1}`}
                  className="hover:text-white"
                >
                  NEXT &gt;
                </Link>
              )}
            </div>
          </nav>
        )}
      </main>
      </div>

      {/* FOOTER */}
      <footer className="border-t border-white/20 bg-black px-4 py-6 text-xs text-gray-500 font-mono uppercase tracking-widest flex flex-col md:flex-row items-start md:items-center justify-between gap-2">
        <div>// EQUALIS_TRANSMISSION_FEED</div>
        <div className="text-[0.6rem] md:text-xs text-gray-600">
          UNIFIED LIQUIDTY - PROGRAMMABLE CREDIT
        </div>
      </footer>
    </div>
  );
}
