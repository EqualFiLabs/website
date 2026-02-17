import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { remark } from 'remark';
import html from 'remark-html';

const postsDirectory = path.join(process.cwd(), 'content/posts');

function enrichMarkdownHtml(rawHtml: string): string {
  return rawHtml
    .replace(
      /<h1>/g,
      '<h1 class="md-h1" style="margin:2.75rem 0 1rem;font-size:1.9rem;line-height:1.2;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:#fff;">',
    )
    .replace(
      /<h2>/g,
      '<h2 class="md-h2" style="margin:2.75rem 0 1rem;font-size:1.45rem;line-height:1.2;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:#fff;">',
    )
    .replace(
      /<h3>/g,
      '<h3 class="md-h3" style="margin:2.25rem 0 .9rem;font-size:1.15rem;line-height:1.25;font-weight:700;letter-spacing:.03em;text-transform:uppercase;color:#e5e7eb;">',
    )
    .replace(
      /<p>/g,
      '<p class="md-p" style="margin:1rem 0;color:#d1d5db;line-height:1.9;">',
    )
    .replace(
      /<hr>/g,
      '<hr class="md-hr" style="border:0;border-top:1px solid #3f3f46;margin:3rem 0;">',
    )
    .replace(
      /<ul>/g,
      '<ul class="md-ul" style="margin:1rem 0 1.5rem;padding-left:1.5rem;color:#d1d5db;list-style:disc outside;">',
    )
    .replace(
      /<ol>/g,
      '<ol class="md-ol" style="margin:1rem 0 1.5rem;padding-left:1.5rem;color:#d1d5db;list-style:decimal outside;">',
    )
    .replace(
      /<li>/g,
      '<li class="md-li" style="margin:.4rem 0;line-height:1.8;display:list-item;">',
    )
    .replace(
      /<blockquote>/g,
      '<blockquote class="md-blockquote" style="margin:1.5rem 0;padding:.2rem 1rem;border-left:3px solid #4b5563;color:#cbd5e1;">',
    );
}

export interface BlogPostData {
  slug: string;
  title: string;
  date: string;
  excerpt: string;
  contentHtml?: string;
  [key: string]: any;
}

export function getSortedPostsData(): BlogPostData[] {
  // Get file names under /content/posts
  const fileNames = fs.readdirSync(postsDirectory);
  const allPostsData = fileNames.map((fileName) => {
    // Remove ".md" from file name to get slug
    const slug = fileName.replace(/\.md$/, '');

    // Read markdown file as string
    const fullPath = path.join(postsDirectory, fileName);
    const fileContents = fs.readFileSync(fullPath, 'utf8');

    // Use gray-matter to parse the post metadata section
    const matterResult = matter(fileContents);

    // Combine the data with the slug
    return {
      slug,
      ...(matterResult.data as { title: string; date: string; excerpt: string }),
    };
  });

  // Sort posts by date
  return allPostsData.sort((a, b) => {
    if (a.date < b.date) {
      return 1;
    } else {
      return -1;
    }
  });
}

export async function getPostData(slug: string): Promise<BlogPostData> {
  const fullPath = path.join(postsDirectory, `${slug}.md`);

  let fileContents: string;
  try {
    fileContents = fs.readFileSync(fullPath, 'utf8');
  } catch (error) {
    // If the markdown file is missing or unreadable, surface the underlying error
    const message = error instanceof Error ? error.message : 'Unknown read error';

    return {
      slug,
      title: 'Post not found',
      date: '',
      excerpt: 'The requested transmission could not be located.',
      contentHtml: `<p>Transmission missing or unavailable.</p><pre>${message}</pre>`,
    };
  }

  // Use gray-matter to parse the post metadata section
  const matterResult = matter(fileContents);

  // Use remark to convert markdown into HTML string
  const processedContent = await remark()
    .use(html)
    .process(matterResult.content);
  const contentHtml = enrichMarkdownHtml(processedContent.toString());

  return {
    slug,
    contentHtml,
    ...(matterResult.data as { title: string; date: string; excerpt: string }),
  };
}
