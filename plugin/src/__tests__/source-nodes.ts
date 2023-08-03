import { createAssetNode, nodeBuilder } from "../source-nodes";
import { authorFixture, postFixture, uploadImageFixture } from "./fixtures";

const nodeIdPlaceholder = `unique-id`;
const contentDigestPlaceholder = `unique-content-digest`;

let gatsbyApi;

describe(`sourceNodes`, () => {
  beforeEach(() => {
    gatsbyApi = {
      cache: {
        set: jest.fn(),
        get: jest.fn(),
      },
      actions: {
        createNode: jest.fn(),
      },
      createContentDigest: jest.fn().mockReturnValue(contentDigestPlaceholder),
      createNodeId: jest.fn().mockReturnValue(nodeIdPlaceholder),
      store: jest.fn(),
      reporter: {
        info: jest.fn(),
        error: jest.fn(),
        panic: jest.fn(),
        activityTimer: (): Record<string, unknown> => ({
          start: jest.fn(),
          end: jest.fn(),
          setStatus: jest.fn(),
        }),
      },
    };
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe(`nodeBuilder`, () => {
    it(`should create correct Author node`, () => {
      nodeBuilder({
        gatsbyApi,
        input: { type: `Author`, data: authorFixture },
      });

      expect(gatsbyApi.actions.createNode.mock.calls[0][0])
        .toMatchInlineSnapshot(`
        {
          "_id": 1,
          "children": [],
          "id": "unique-id",
          "internal": {
            "contentDigest": "unique-content-digest",
            "type": "Author",
          },
          "name": "Jay Gatsby",
          "parent": null,
        }
      `);
    });
    it(`should create correct Post node`, () => {
      nodeBuilder({ gatsbyApi, input: { type: `Post`, data: postFixture } });

      expect(gatsbyApi.actions.createNode.mock.calls[0][0])
        .toMatchInlineSnapshot(`
        {
          "_id": 1,
          "author": "Jay Gatsby",
          "children": [],
          "id": "unique-id",
          "image": {
            "alt": "brown and white long coated dog",
            "height": 4032,
            "url": "https://images.unsplash.com/photo-1615751072497-5f5169febe17?fm=jpg",
            "width": 3024,
          },
          "internal": {
            "contentDigest": "unique-content-digest",
            "type": "Post",
          },
          "parent": null,
          "slug": "post-1",
          "title": "The first post",
        }
      `);
    });
  });
  describe(`createAssetNode`, () => {
    it(`should create correct node shape`, () => {
      const id = createAssetNode(gatsbyApi, uploadImageFixture);

      expect(id).toEqual(nodeIdPlaceholder);
      expect(gatsbyApi.actions.createNode.mock.calls[0][0])
        .toMatchInlineSnapshot(`
        {
          "alt": "Two businesspeople in a meeting room looking at a phone",
          "children": [],
          "filename": "/marketing-site-images/muhammad-faiz-zulkeflee-alw-CwGFmwQ-unsplash-1.jpg",
          "height": 5000,
          "id": "unique-id",
          "internal": {
            "contentDigest": "unique-content-digest",
            "type": "Asset",
          },
          "mimeType": "image/jpeg",
          "parent": null,
          "relationships": [],
          "url": "/marketing-site-images/muhammad-faiz-zulkeflee-alw-CwGFmwQ-unsplash-1.jpg",
          "width": 4000,
        }
      `);
    });
  });
});
