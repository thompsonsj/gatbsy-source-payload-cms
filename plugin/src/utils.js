"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeCollections = exports.normalizeGlobals = exports.payloadImageUrl = exports.payloadImage = exports.documentRelationships = exports.gatsbyNodeTypeName = exports.fetchDataMessage = exports.fetchGraphQL = void 0;
var dot_object_1 = __importDefault(require("dot-object"));
var node_fetch_1 = __importDefault(require("node-fetch"));
var lodash_1 = require("lodash");
var headers = {
    "Content-Type": "application/json",
};
/**
 * Fetch utility for requests to the example api.
 * You can use a GraphQL client module instead if you prefer a more full-featured experience.
 * @see https://graphql.org/code/#javascript-client
 */
function fetchGraphQL(endpoint, query) {
    return __awaiter(this, void 0, void 0, function () {
        var response;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, (0, node_fetch_1.default)(endpoint, {
                        method: "POST",
                        headers: headers,
                        body: JSON.stringify({
                            query: query,
                        }),
                    })];
                case 1:
                    response = _a.sent();
                    return [4 /*yield*/, response.json()];
                case 2: return [2 /*return*/, (_a.sent())];
            }
        });
    });
}
exports.fetchGraphQL = fetchGraphQL;
var fetchDataMessage = function (url, serializedParams) {
    var message = ["Starting to fetch data from Payload - ".concat(url)];
    if (!(0, lodash_1.isEmpty)(serializedParams)) {
        message.push("with ".concat(serializedParams));
    }
    return message.join(" ");
};
exports.fetchDataMessage = fetchDataMessage;
var gatsbyNodeTypeName = function (_a) {
    var payloadSlug = _a.payloadSlug, _b = _a.prefix, prefix = _b === void 0 ? "Payload" : _b;
    return "".concat(prefix).concat((0, lodash_1.upperFirst)((0, lodash_1.camelCase)(payloadSlug)));
};
exports.gatsbyNodeTypeName = gatsbyNodeTypeName;
/**
 * Get doc relationships
 *
 * From an API response, return dot notation key value pairs of relationship ids only.
 *
 * Note that this only works if the relationship is expanded.
 * i.e. it includes an `id` field. Consider adding support
 * for non-expanded relationships. e.g.
 * ``"hereForYou.image": "64877d207ac104cf4d385657"`.
 *
 * The document id is excluded (desirable) because it doesn't
 * end with `.id`. e.g. `"id": "64877d207ac104cf4d385657"`.
 */
var documentRelationships = function (doc, prefix) {
    var _a;
    var document = prefix
        ? (_a = {},
            _a[prefix] = doc,
            _a) : doc;
    var dotNotationDoc = dot_object_1.default.dot(document);
    return (0, lodash_1.omitBy)(dotNotationDoc, function (_value, key) { return !key.endsWith(".id"); });
};
exports.documentRelationships = documentRelationships;
var removeTrailingSlash = function (str) { return str.replace(/\/$/, ""); };
var payloadImage = function (apiResponse, size) {
    var image = size ? (0, lodash_1.get)(apiResponse, "sizes.".concat(size), apiResponse) : apiResponse;
    // some sizes may not exist (e.g resize operations on images that are too small)
    if (!image || !image.url) {
        image = apiResponse;
    }
    return image;
};
exports.payloadImage = payloadImage;
var payloadImageUrl = function (apiResponse, size, baseUrl) {
    if (!apiResponse || typeof apiResponse.url === "undefined") {
        return undefined;
    }
    var url = (0, exports.payloadImage)(apiResponse, size).url;
    return url ? "".concat(removeTrailingSlash(baseUrl)).concat(url) : undefined;
};
exports.payloadImageUrl = payloadImageUrl;
var normalizeGlobals = function (globalTypes, endpoint) {
    if (!globalTypes) {
        return [];
    }
    return globalTypes.map(function (globalType) {
        return normalizeGlobal(globalType, endpoint);
    });
};
exports.normalizeGlobals = normalizeGlobals;
var normalizeCollections = function (collectionTypes, endpoint) {
    if (!collectionTypes) {
        return [];
    }
    return collectionTypes.map(function (collectionType) { return normalizeCollection(collectionType, endpoint); });
};
exports.normalizeCollections = normalizeCollections;
var normalizeCollection = function (collectionType, endpoint) {
    if ((0, lodash_1.isString)(collectionType)) {
        return normalizeCollectionString(collectionType, endpoint);
    }
    return normalizeCollectionObject(collectionType, endpoint);
};
var normalizeCollectionString = function (collectionType, endpoint) { return ({
    endpoint: new URL("".concat(collectionType), endpoint).href,
    type: collectionType,
}); };
var normalizeCollectionObject = function (collectionType, endpoint) { return (__assign(__assign({ endpoint: new URL("".concat(collectionType.slug), endpoint).href }, collectionType), { type: collectionType.slug })); };
var normalizeGlobal = function (globalType, endpoint) {
    if ((0, lodash_1.isString)(globalType)) {
        return normalizeGlobalString(globalType, endpoint);
    }
    return normalizeGlobalObject(globalType, endpoint);
};
var normalizeGlobalString = function (globalType, endpoint) { return ({
    endpoint: new URL("globals/".concat(globalType), endpoint).href,
    type: globalType,
}); };
var normalizeGlobalObject = function (globalType, endpoint) {
    var urlPath = globalType.apiPath ? globalType.apiPath : "globals/".concat(globalType.slug);
    return __assign(__assign({ endpoint: new URL(urlPath, endpoint).href }, globalType), { type: globalType.slug });
};
