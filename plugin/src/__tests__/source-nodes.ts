import { createAssetNode, createLocalFileNode, nodeBuilder, sourceNodes } from "../source-nodes";
import { authorFixture, postFixture, uploadImageFixture } from "./fixtures";
import { fetchEntities, fetchEntity } from "../fetch";
import { createAxiosInstance } from "../axios-instance";
import { createRemoteFileNode } from "gatsby-source-filesystem";

jest.mock(`../fetch`);
jest.mock(`../axios-instance`);
jest.mock(`gatsby-source-filesystem`);

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
    it(`appends locale to the node id fragments when the data has a locale`, () => {
      nodeBuilder({
        gatsbyApi,
        input: { type: `Post`, data: { ...postFixture, locale: `en` } },
      });

      expect(gatsbyApi.createNodeId).toHaveBeenCalledWith(`Post-${postFixture.id}-en`);
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
    it(`filters relationshipIds down to those matching the document id`, () => {
      createAssetNode(gatsbyApi, uploadImageFixture, {
        "hero.image.id": uploadImageFixture.id,
        "footer.logo.id": `some-other-document-id`,
      });

      expect(gatsbyApi.actions.createNode.mock.calls[0][0].relationships).toEqual([`hero.image.id`]);
    });
  });
});

const callSourceNodes = (gatsbyApi: any, pluginOptions: any) =>
  (sourceNodes as any)(gatsbyApi, pluginOptions, jest.fn());

describe(`sourceNodes (main function)`, () => {
  const basePluginOptions = { endpoint: `http://localhost:8000/api/` };

  const buildGatsbyApi = (existingNodes: any[] = []) => ({
    actions: {
      createNode: jest.fn(),
      touchNode: jest.fn(),
      createNodeField: jest.fn(),
    },
    cache: {
      get: jest.fn().mockResolvedValue(undefined),
      set: jest.fn().mockResolvedValue(undefined),
    },
    getNodes: jest.fn().mockReturnValue(existingNodes),
    createContentDigest: jest.fn().mockReturnValue(`digest`),
    createNodeId: jest.fn((input: string) => `id-${input}`),
    getCache: jest.fn(),
    reporter: {
      info: jest.fn(),
      verbose: jest.fn(),
      error: jest.fn(),
      panic: jest.fn(),
      activityTimer: (): Record<string, unknown> => ({
        start: jest.fn(),
        end: jest.fn(),
        setStatus: jest.fn(),
      }),
    },
  });

  beforeEach(() => {
    jest.clearAllMocks();
    (createAxiosInstance as jest.Mock).mockReturnValue(`axios-instance-stub`);
    (fetchEntities as jest.Mock).mockResolvedValue([]);
    (fetchEntity as jest.Mock).mockResolvedValue([]);
    (createRemoteFileNode as jest.Mock).mockResolvedValue({ id: `file-1` });
  });

  it(`touches all plugin-owned nodes on the first run of the process only`, async () => {
    // isFirstSource is a module-level singleton, so exercise it on an isolated,
    // freshly-required copy of the module rather than depending on test order.
    jest.resetModules();
    const freshSourceNodes = require(`../source-nodes`).sourceNodes;
    const freshFetch = require(`../fetch`);
    const freshAxiosInstance = require(`../axios-instance`);
    freshFetch.fetchEntities.mockResolvedValue([]);
    freshFetch.fetchEntity.mockResolvedValue([]);
    freshAxiosInstance.createAxiosInstance.mockReturnValue(`axios-instance-stub`);

    const ownedNode = { id: `1`, internal: { owner: `gatsby-source-payload-cms` } };
    const foreignNode = { id: `2`, internal: { owner: `some-other-plugin` } };
    const gatsbyApi = buildGatsbyApi([ownedNode, foreignNode]);

    await freshSourceNodes(gatsbyApi, basePluginOptions, jest.fn());
    await freshSourceNodes(gatsbyApi, basePluginOptions, jest.fn());

    // Only touched once, during the first of the two runs above.
    expect(gatsbyApi.actions.touchNode).toHaveBeenCalledTimes(1);
    expect(gatsbyApi.actions.touchNode).toHaveBeenCalledWith(ownedNode);
  });

  it(`fetches collections/uploads via fetchEntities and globals via fetchEntity, using normalized endpoints`, async () => {
    const gatsbyApi = buildGatsbyApi();

    await callSourceNodes(gatsbyApi, {
      ...basePluginOptions,
      collectionTypes: [`posts`],
      globalTypes: [`nav`],
      uploadTypes: [`headshots`],
    });

    expect(fetchEntities).toHaveBeenCalledTimes(2);
    expect(fetchEntity).toHaveBeenCalledTimes(1);
    const collectionEndpoints = (fetchEntities as jest.Mock).mock.calls.map(([query]) => query.endpoint);
    expect(collectionEndpoints).toContain(`http://localhost:8000/api/posts`);
    expect(collectionEndpoints).toContain(`http://localhost:8000/api/headshots`);
    expect((fetchEntity as jest.Mock).mock.calls[0][0].endpoint).toEqual(`http://localhost:8000/api/globals/nav`);
  });

  it(`creates a node per fetched collection entity, honoring nodePrefix`, async () => {
    const gatsbyApi = buildGatsbyApi();
    (fetchEntities as jest.Mock).mockResolvedValueOnce([{ id: `1`, gatsbyNodeType: `posts` }]);

    await callSourceNodes(gatsbyApi, {
      ...basePluginOptions,
      collectionTypes: [`posts`],
      nodePrefix: `CMS`,
    });

    expect(gatsbyApi.actions.createNode).toHaveBeenCalledTimes(1);
    expect(gatsbyApi.actions.createNode.mock.calls[0][0].internal.type).toEqual(`CMSPost`);
  });

  it(`creates a node per fetched global entity, using the default Payload prefix`, async () => {
    const gatsbyApi = buildGatsbyApi();
    (fetchEntity as jest.Mock).mockResolvedValueOnce([{ id: `1`, gatsbyNodeType: `nav` }]);

    await callSourceNodes(gatsbyApi, { ...basePluginOptions, globalTypes: [`nav`] });

    expect(gatsbyApi.actions.createNode).toHaveBeenCalledTimes(1);
    expect(gatsbyApi.actions.createNode.mock.calls[0][0].internal.type).toEqual(`PayloadNav`);
  });

  it(`creates a local file node for uploads when localFiles is set`, async () => {
    const gatsbyApi = buildGatsbyApi();
    (fetchEntities as jest.Mock).mockResolvedValueOnce([
      { id: `1`, gatsbyNodeType: `headshots`, url: `/media/a.jpg` },
    ]);

    await callSourceNodes(gatsbyApi, {
      ...basePluginOptions,
      uploadTypes: [`headshots`],
      localFiles: true,
    });

    expect(createRemoteFileNode).toHaveBeenCalledTimes(1);
    expect((createRemoteFileNode as jest.Mock).mock.calls[0][0].url).toEqual(`/media/a.jpg`);
  });

  it(`awaits createLocalFileNode before resolving, so file nodes are guaranteed to exist when sourcing finishes`, async () => {
    // createLocalFileNode is async (it downloads a file and creates a node).
    // If sourceNodes doesn't await it, sourceNodes can resolve before the file
    // node exists (a race downstream schema/page-building code can lose), and
    // a rejected download becomes an unhandled promise rejection outside
    // Gatsby's own error handling instead of a clean, reported build failure.
    const gatsbyApi = buildGatsbyApi();
    (fetchEntities as jest.Mock).mockResolvedValueOnce([
      { id: `1`, gatsbyNodeType: `headshots`, url: `/media/a.jpg` },
    ]);

    let resolveFileNode: (value: unknown) => void;
    (createRemoteFileNode as jest.Mock).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveFileNode = resolve;
        })
    );

    let sourceNodesResolved = false;
    const sourceNodesPromise = callSourceNodes(gatsbyApi, {
      ...basePluginOptions,
      uploadTypes: [`headshots`],
      localFiles: true,
    }).then(() => {
      sourceNodesResolved = true;
    });

    // Flush microtasks until the download has actually started, without ever
    // resolving it.
    for (let i = 0; i < 20 && (createRemoteFileNode as jest.Mock).mock.calls.length === 0; i++) {
      await Promise.resolve();
    }
    expect(createRemoteFileNode).toHaveBeenCalledTimes(1);

    // Keep flushing well beyond that point. If createLocalFileNode were fired
    // and forgotten (not awaited), nothing would block sourceNodes from
    // finishing here, even though resolveFileNode was never called - so this
    // is the assertion that actually distinguishes "properly awaited" from
    // "looked awaited by timing coincidence".
    for (let i = 0; i < 50; i++) {
      await Promise.resolve();
    }
    expect(sourceNodesResolved).toBe(false);

    resolveFileNode({ id: `file-1` });
    await sourceNodesPromise;
    expect(sourceNodesResolved).toBe(true);
  });

  it(`creates an asset node and links its id onto the upload node when imageCdn is set`, async () => {
    const gatsbyApi = buildGatsbyApi();
    (fetchEntities as jest.Mock).mockResolvedValueOnce([
      {
        id: `1`,
        gatsbyNodeType: `headshots`,
        url: `/media/a.jpg`,
        width: 100,
        height: 100,
        mimeType: `image/jpeg`,
      },
    ]);

    await callSourceNodes(gatsbyApi, {
      ...basePluginOptions,
      uploadTypes: [`headshots`],
      imageCdn: true,
    });

    // One call for the Asset node, one for the upload node itself.
    expect(gatsbyApi.actions.createNode).toHaveBeenCalledTimes(2);
    const uploadNode = gatsbyApi.actions.createNode.mock.calls[1][0];
    expect(uploadNode.gatsbyImageCdn).toBeDefined();
  });

  it(`persists the current timestamp to the cache after sourcing`, async () => {
    const gatsbyApi = buildGatsbyApi();

    await callSourceNodes(gatsbyApi, basePluginOptions);

    expect(gatsbyApi.cache.set).toHaveBeenCalledWith(`updatedAt`, expect.any(Number));
  });

  it(`links an upload's relationships back to the collection document that references it, when localFiles is set`, async () => {
    const gatsbyApi = buildGatsbyApi();
    (fetchEntities as jest.Mock).mockImplementation(async (query) => {
      if (query.type === `posts`) {
        return [{ id: `post-1`, gatsbyNodeType: `posts`, hero: { image: { id: `upload-1` } } }];
      }
      return [{ id: `upload-1`, gatsbyNodeType: `headshots`, url: `/media/a.jpg` }];
    });

    await callSourceNodes(gatsbyApi, {
      ...basePluginOptions,
      collectionTypes: [`posts`],
      uploadTypes: [`headshots`],
      localFiles: true,
    });

    expect(gatsbyApi.actions.createNodeField).toHaveBeenCalledWith({
      node: { id: `file-1` },
      name: `relationships`,
      value: [`posts.post-1.hero.image.id`],
    });
  });

  it(`links an upload's relationships back to a global document that references it, when localFiles is set`, async () => {
    const gatsbyApi = buildGatsbyApi();
    (fetchEntity as jest.Mock).mockResolvedValueOnce([
      { id: `nav-1`, gatsbyNodeType: `nav`, logo: { id: `upload-1` } },
    ]);
    (fetchEntities as jest.Mock).mockResolvedValueOnce([{ id: `upload-1`, gatsbyNodeType: `headshots`, url: `/media/a.jpg` }]);

    await callSourceNodes(gatsbyApi, {
      ...basePluginOptions,
      globalTypes: [`nav`],
      uploadTypes: [`headshots`],
      localFiles: true,
    });

    expect(gatsbyApi.actions.createNodeField).toHaveBeenCalledWith({
      node: { id: `file-1` },
      name: `relationships`,
      value: [`nav.logo.id`],
    });
  });
});

describe(`createLocalFileNode`, () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (createRemoteFileNode as jest.Mock).mockResolvedValue({ id: `file-1` });
  });

  it(`creates a remote file node using the resolved image url, stripping a trailing base url slash`, async () => {
    const createNode = jest.fn();
    const createNodeField = jest.fn();
    const getCache = jest.fn();

    const context = {
      actions: { createNode, createNodeField },
      getCache,
      pluginOptions: { baseUrl: `http://localhost:8000/` },
    };

    await createLocalFileNode(context as any, uploadImageFixture);

    expect(createRemoteFileNode).toHaveBeenCalledWith(
      expect.objectContaining({
        url: `http://localhost:8000${uploadImageFixture.url}`,
        createNode,
        getCache,
      })
    );
    const { createNodeId } = (createRemoteFileNode as jest.Mock).mock.calls[0][0];
    expect(createNodeId()).toEqual(`upload-${uploadImageFixture.id}`);
  });

  it(`adds a relationships field when a relationship points at this document`, async () => {
    const createNode = jest.fn();
    const createNodeField = jest.fn();

    const context = {
      actions: { createNode, createNodeField },
      getCache: jest.fn(),
      pluginOptions: {},
    };

    await createLocalFileNode(context as any, uploadImageFixture, {
      "hero.image.id": uploadImageFixture.id,
    });

    expect(createNodeField).toHaveBeenCalledWith({
      node: { id: `file-1` },
      name: `relationships`,
      value: [`hero.image.id`],
    });
  });

  it(`does not add a relationships field when nothing points at this document`, async () => {
    const createNode = jest.fn();
    const createNodeField = jest.fn();

    const context = {
      actions: { createNode, createNodeField },
      getCache: jest.fn(),
      pluginOptions: {},
    };

    await createLocalFileNode(context as any, uploadImageFixture, {
      "hero.image.id": `some-other-id`,
    });

    expect(createNodeField).not.toHaveBeenCalled();
  });
});
