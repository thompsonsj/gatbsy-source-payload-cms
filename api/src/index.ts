import fs from "fs"
import path from "path"
import { createSchema, createYoga } from "graphql-yoga"
import { createServer } from "node:http"
import { authors, posts, postIds, IAuthor, IPost } from "./data"

const typeDefsPath = path.resolve(__dirname, `../src/schema.graphql`)
const typeDefs = fs.readFileSync(typeDefsPath, `utf-8`)

export const schema = createSchema({
  typeDefs,
  resolvers: {
    Query: {
      authors: () => authors,
      posts: () => posts,
    },
    Author: {
      id: (parent: IAuthor) => parent.id,
      name: (parent: IAuthor) => parent.name,
    },
    Post: {
      id: (parent: IPost) => parent.id,
      slug: (parent: IPost) => parent.slug,
      title: (parent: IPost) => parent.title,
      author: (parent: IPost) => parent.author,
    },
    Mutation: {
      createPost: (_, { slug, title }) => {
        const post = {
          id: postIds.length + 1,
          slug,
          title,
          image: {
            url: `https://images.unsplash.com/photo-1615751072497-5f5169febe17?fm=jpg`,
            alt: `brown and white long coated dog`,
            width: 3024,
            height: 4032,
          },
          author: `Jay Gatsby`,
        }
        posts.push(post)
        return post
      },
      updatePost: (_, { id, title }) => {
        const postIndex = posts.findIndex((post) => id === post.id)

        if (postIndex === null) {
          return null
        }
        posts[postIndex] = { ...posts[postIndex], title }

        return posts[postIndex]
      },
      deletePost: (_, { id }) => {
        const postIndex = posts.findIndex((post) => id === post.id)

        if (postIndex === null) {
          return null
        }
        const post = posts[postIndex]
        posts.splice(postIndex, 1)

        return post
      },
    },
  },
})

const yoga = createYoga({ schema })
const server = createServer(yoga)

server.listen(4000, () => {
  console.info(`Server is running at http://localhost:4000/graphql`)
})
