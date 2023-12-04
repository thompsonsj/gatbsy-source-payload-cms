"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ERROR_CODES = exports.CACHE_KEYS = exports.NODE_TYPES = void 0;
exports.NODE_TYPES = {
    Post: "Post",
    Author: "Author",
    Asset: "Asset",
};
exports.CACHE_KEYS = {
    Timestamp: "updatedAt",
};
/**
 * The IDs for your errors can be arbitrary (since they are scoped to your plugin), but it's good practice to have a system for them.
 * For example, you could start all third-party API errors with 1000x, all transformation errors with 2000x, etc.
 */
exports.ERROR_CODES = {
    GraphQLSourcing: "10000",
};
