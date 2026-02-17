import { getPostData, getSortedPostsData } from "@/lib/posts";

export async function generateStaticParams() {
  const posts = getSortedPostsData();
  return posts.map((post) => ({
    slug: post.slug,
  }));
}

export default async function BlogPost({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const postData = await getPostData(slug);

  return (
    <div className="min-h-screen grid-bg flex flex-col items-center justify-center p-4 md:p-12">
      {/* Debug: show the slug being used to fetch the post */}
      <div className="fixed bottom-4 right-4 text-xs text-gray-600 font-mono bg-black/70 px-2 py-1 border border-white/10">
        slug: {String(slug)}
      </div>
      <div className="max-w-3xl w-full border border-white/20 bg-black p-8 md:p-16 relative">
        <div className="absolute top-0 left-0 bg-white text-black px-4 py-1 font-mono text-xs font-bold uppercase tracking-widest">
            TRANS_LOG // {postData.date}
        </div>

        <div className="mb-8 mt-4">
          <a href="/blog" className="text-sm text-gray-500 hover:text-white transition-colors font-mono uppercase tracking-widest">
            &lt; RETURN_TO_INDEX
          </a>
        </div>

        <article className="blog-article">
          <div className="frontmatter-block" aria-label="Post frontmatter">
            <div className="frontmatter-label">frontmatter</div>
            <div className="frontmatter-row">
              <span className="frontmatter-key">title</span>
              <span className="frontmatter-value">"{postData.title}"</span>
            </div>
            <div className="frontmatter-row">
              <span className="frontmatter-key">date</span>
              <span className="frontmatter-value">"{postData.date}"</span>
            </div>
            <div className="frontmatter-row">
              <span className="frontmatter-key">excerpt</span>
              <span className="frontmatter-value">"{postData.excerpt}"</span>
            </div>
          </div>

          <div className="blog-content" dangerouslySetInnerHTML={{ __html: postData.contentHtml || "" }} />
        </article>
      </div>
    </div>
  );
}
