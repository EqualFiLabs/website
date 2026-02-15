import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { remark } from 'remark';
import html from 'remark-html';

const postsDirectory = path.join(process.cwd(), 'content/posts');

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
  const contentHtml = processedContent.toString();

  return {
    slug,
    contentHtml,
    ...(matterResult.data as { title: string; date: string; excerpt: string }),
  };
}
