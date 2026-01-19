/**
 * OpenAPI specification parser.
 * Handles loading and parsing of OpenAPI 3.x specifications.
 */

import { readFile } from 'node:fs/promises';
import OpenAPIParser from '@readme/openapi-parser';
import { parse as parseYaml } from 'yaml';
import type { OpenAPIV3, OpenAPIV3_1 } from 'openapi-types';
import type { ParsedSpec, EndpointInfo, TagInfo, ServerInfo, ApiInfo } from '../types.js';

type OpenAPIDocument = OpenAPIV3.Document | OpenAPIV3_1.Document;
type PathItem = OpenAPIV3.PathItemObject | OpenAPIV3_1.PathItemObject;
type Operation = OpenAPIV3.OperationObject | OpenAPIV3_1.OperationObject;

const HTTP_METHODS = ['get', 'post', 'put', 'patch', 'delete', 'head', 'options'] as const;

/**
 * Parser for OpenAPI specifications.
 */
export class SpecParser {
  /**
   * Parse an OpenAPI spec from a file path or URL.
   */
  async parse(source: string): Promise<ParsedSpec> {
    let rawSpec: unknown;

    // Load the spec
    if (source.startsWith('http://') || source.startsWith('https://')) {
      rawSpec = await this.loadFromUrl(source);
    } else {
      rawSpec = await this.loadFromFile(source);
    }

    // Validate and dereference
    const validated = await OpenAPIParser.validate(rawSpec as OpenAPIDocument) as OpenAPIDocument;
    const dereferenced = await OpenAPIParser.dereference(structuredClone(rawSpec) as OpenAPIDocument) as OpenAPIDocument;

    return this.convertToInternal(validated, dereferenced);
  }

  /**
   * Load spec from file.
   */
  private async loadFromFile(filePath: string): Promise<unknown> {
    const content = await readFile(filePath, 'utf-8');
    
    if (filePath.endsWith('.yaml') || filePath.endsWith('.yml')) {
      return parseYaml(content);
    }
    
    return JSON.parse(content);
  }

  /**
   * Load spec from URL.
   */
  private async loadFromUrl(url: string): Promise<unknown> {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch spec: ${response.status} ${response.statusText}`);
    }

    const contentType = response.headers.get('content-type') ?? '';
    const text = await response.text();

    if (contentType.includes('yaml') || url.endsWith('.yaml') || url.endsWith('.yml')) {
      return parseYaml(text);
    }

    return JSON.parse(text);
  }

  /**
   * Convert OpenAPI document to internal format.
   */
  private convertToInternal(validated: OpenAPIDocument, dereferenced: OpenAPIDocument): ParsedSpec {
    const endpoints = this.extractEndpoints(dereferenced);
    const schemas = this.extractSchemas(dereferenced);
    const tags = this.extractTags(validated);
    const servers = this.extractServers(validated);
    const info = this.extractInfo(validated);

    return {
      openApiVersion: validated.openapi,
      info,
      endpoints,
      schemas,
      tags,
      servers,
      raw: validated,
    };
  }

  /**
   * Extract API info.
   */
  private extractInfo(doc: OpenAPIDocument): ApiInfo {
    return {
      title: doc.info.title,
      version: doc.info.version,
      description: doc.info.description,
      contact: doc.info.contact ? {
        name: doc.info.contact.name,
        email: doc.info.contact.email,
        url: doc.info.contact.url,
      } : undefined,
    };
  }

  /**
   * Extract endpoints from paths.
   */
  private extractEndpoints(doc: OpenAPIDocument): EndpointInfo[] {
    const endpoints: EndpointInfo[] = [];

    if (!doc.paths) {
      return endpoints;
    }

    for (const [path, pathItem] of Object.entries(doc.paths)) {
      if (!pathItem) continue;

      for (const method of HTTP_METHODS) {
        const operation = (pathItem as PathItem)[method] as Operation | undefined;
        if (!operation) continue;

        endpoints.push({
          method: method.toUpperCase(),
          path,
          operationId: operation.operationId,
          summary: operation.summary,
          description: operation.description,
          tags: operation.tags,
          deprecated: operation.deprecated,
        });
      }
    }

    return endpoints;
  }

  /**
   * Extract schemas from components.
   */
  private extractSchemas(doc: OpenAPIDocument): Record<string, unknown> {
    if ('components' in doc && doc.components?.schemas) {
      return doc.components.schemas as Record<string, unknown>;
    }
    return {};
  }

  /**
   * Extract tags.
   */
  private extractTags(doc: OpenAPIDocument): TagInfo[] {
    if (!doc.tags) {
      return [];
    }

    return doc.tags.map((tag) => ({
      name: tag.name,
      description: tag.description,
    }));
  }

  /**
   * Extract servers.
   */
  private extractServers(doc: OpenAPIDocument): ServerInfo[] {
    if (!doc.servers) {
      return [];
    }

    return doc.servers.map((server) => ({
      url: server.url,
      description: server.description,
    }));
  }
}
