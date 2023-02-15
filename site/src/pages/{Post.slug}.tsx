import * as React from "react"
import { Link, graphql, PageProps, HeadFC } from "gatsby"
import { GatsbyImage, getImage } from "gatsby-plugin-image"

export default function PostPage({ data: { post } }: PageProps<{ post: Queries.Post }>): React.ReactElement {
  return (
    <main>
      <h1>{post.title}</h1>
      <p>Author: {post.author.name}</p>
      <br />
      <Link to="/">Back to home page</Link>
      <div className="image">
        <GatsbyImage alt={post.image.alt} image={getImage(post.image.gatsbyImage)} />
      </div>
    </main>
  )
}

export const Head: HeadFC<{ post: Queries.Post }> = ({ data: { post } }) => (
  <React.Fragment>
    <title>{post.title}</title>
    <link
      rel="icon"
      href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='0.9em' font-size='90'>🌈</text></svg>"
    />
  </React.Fragment>
)

export const query = graphql`
  query PostPage($slug: String!) {
    post(slug: { eq: $slug }) {
      title
      author {
        name
      }
      image {
        gatsbyImage(width: 300)
        alt
      }
    }
  }
`
