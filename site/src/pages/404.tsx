import * as React from "react"
import { Link, HeadFC } from "gatsby"

export default function NotFoundPage(): React.ReactElement {
  return (
    <main>
      <h1>Page not found</h1>
      <br />
      <Link to="/">Go home</Link>.
    </main>
  )
}

export const Head: HeadFC = () => <title>404 - Page Not Found</title>
