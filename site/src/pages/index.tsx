import * as React from "react"
import { Link, graphql, HeadFC, PageProps } from "gatsby"

export default function IndexPage({
  data: {
    allPost: { nodes: posts },
  },
}: PageProps<Queries.IndexPageQuery>): React.ReactElement {
  return (
    <main>
      <h1>All posts</h1>
      <section className="posts-grid">
        {posts.map((post) => (
          <Link key={post.id} to={post.slug} className="posts-card">
            <h2>{post.title}</h2>
            <span>Author: {post.author.name}</span>
          </Link>
        ))}
      </section>
    </main>
  )
}

export const Head: HeadFC = () => (
  <React.Fragment>
    <title>Example Site</title>
    <link
      rel="icon"
      href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='0.9em' font-size='90'>🌈</text></svg>"
    />
  </React.Fragment>
)

export const query = graphql`
  query IndexPage {
    allPost {
      nodes {
        id
        slug
        title
        author {
          name
        }
      }
    }
  }
`
