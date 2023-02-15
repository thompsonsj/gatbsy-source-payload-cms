export interface IAuthor {
  id: number
  name: string
}

export const authors = [
  {
    id: 1,
    name: `Jay Gatsby`,
  },
  {
    id: 2,
    name: `Daisy Buchanan`,
  },
] satisfies Array<IAuthor>

export const postIds: Array<number> = [1, 2, 3]

export interface IPostImage {
  url: string
  alt: string
  width: number
  height: number
}

export interface IPost {
  id: number
  slug: string
  title: string
  image: IPostImage
  author: string
}

export const posts = [
  {
    id: postIds[0],
    slug: `post-1`,
    title: `The first post`,
    image: {
      url: `https://images.unsplash.com/photo-1615751072497-5f5169febe17?fm=jpg`,
      alt: `brown and white long coated dog`,
      width: 3024,
      height: 4032,
    },
    author: `Jay Gatsby`,
  },
  {
    id: postIds[1],
    slug: `post-2`,
    title: `The second post`,
    image: {
      url: `https://images.unsplash.com/photo-1591160690555-5debfba289f0?fm=jpg`,
      alt: `golden retriever puppy on focus`,
      width: 5394,
      height: 6743,
    },
    author: `Jay Gatsby`,
  },
  {
    id: postIds[2],
    slug: `post-3`,
    title: `The third post`,
    image: {
      url: `https://images.unsplash.com/photo-1547525623-c7d42c20284c?fm=jpg`,
      alt: `long fur white dog on grass`,
      width: 4000,
      height: 6000,
    },
    author: `Daisy Buchanan`,
  },
] satisfies Array<IPost>
