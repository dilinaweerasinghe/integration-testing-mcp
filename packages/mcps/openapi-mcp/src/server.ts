/**
 * OpenAPI Metadata MCP Server implementation.
 */

import { BaseMcpServer, createSchema } from '@ifs/mcp-core';
import { createLogger, createAuditLogger, type AuditLogger } from '@ifs/logging';
import { SpecParser } from './parser/spec-parser.js';
import { EntityExtractor } from './extractor/entity-extractor.js';
import { OperationMapper } from './mapper/operation-mapper.js';
import type { ParsedSpec, EndpointInfo, EntitySchema, OperationDetails } from './types.js';

/**
 * OpenAPI Metadata MCP Server.
 * Provides tools for parsing OpenAPI specs and extracting service metadata.
 */
export class OpenApiMcpServer extends BaseMcpServer {
  private readonly logger = createLogger({ name: 'openapi-mcp' });
  private readonly auditLogger: AuditLogger;
  private readonly specParser = new SpecParser();
  private readonly entityExtractor = new EntityExtractor();
  private readonly operationMapper = new OperationMapper();
  
  private loadedSpecs = new Map<string, ParsedSpec>();

  constructor() {
    super({
      name: 'openapi-mcp',
      version: '1.0.0',
      description: 'Parses OpenAPI specifications for Cloud ERP services',
    });

    this.auditLogger = createAuditLogger({
      logDirectory: process.env['AUDIT_LOG_DIR'] ?? './logs/audit',
      serverName: 'openapi-mcp',
      enabled: process.env['AUDIT_LOG_ENABLED'] !== 'false',
    });
  }

  protected registerTools(): void {
    // Tool: loadSpec
    this.registerTool(
      {
        name: 'loadSpec',
        description: 'Loads an OpenAPI specification from a file path or URL. Returns a spec ID for subsequent operations.',
        inputSchema: createSchema()
          .string('source', 'File path or URL to the OpenAPI spec (JSON or YAML)', { required: true })
          .string('specId', 'Optional identifier for this spec (auto-generated if not provided)')
          .build(),
      },
      async (args) => this.handleLoadSpec(args as { source: string; specId?: string })
    );

    // Tool: listEndpoints
    this.registerTool(
      {
        name: 'listEndpoints',
        description: 'Lists all API endpoints from a loaded spec with method, path, and summary',
        inputSchema: createSchema()
          .string('specId', 'The spec ID returned by loadSpec', { required: true })
          .string('tag', 'Filter by tag name')
          .string('pathPattern', 'Filter by path regex pattern')
          .array('methods', 'Filter by HTTP methods', { type: 'string' })
          .build(),
      },
      async (args) => this.handleListEndpoints(args as {
        specId: string;
        tag?: string;
        pathPattern?: string;
        methods?: string[];
      })
    );

    // Tool: getEntitySchema
    this.registerTool(
      {
        name: 'getEntitySchema',
        description: 'Extracts entity schema including keys, data types, and required fields',
        inputSchema: createSchema()
          .string('specId', 'The spec ID', { required: true })
          .string('schemaName', 'Name of the schema/entity to extract', { required: true })
          .boolean('resolveRefs', 'Resolve $ref references', { default: true })
          .boolean('includeExamples', 'Include example values if available', { default: true })
          .build(),
      },
      async (args) => this.handleGetEntitySchema(args as {
        specId: string;
        schemaName: string;
        resolveRefs?: boolean;
        includeExamples?: boolean;
      })
    );

    // Tool: getOperationDetails
    this.registerTool(
      {
        name: 'getOperationDetails',
        description: 'Returns full operation details including parameters, request body, and responses',
        inputSchema: createSchema()
          .string('specId', 'The spec ID', { required: true })
          .string('operationId', 'The operation ID')
          .string('path', 'The endpoint path')
          .string('method', 'HTTP method (required if using path)', { enum: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] })
          .build(),
      },
      async (args) => this.handleGetOperationDetails(args as {
        specId: string;
        operationId?: string;
        path?: string;
        method?: string;
      })
    );

    // Tool: searchOperations
    this.registerTool(
      {
        name: 'searchOperations',
        description: 'Searches operations by various criteria',
        inputSchema: createSchema()
          .string('specId', 'The spec ID', { required: true })
          .string('query', 'Search query (matches description, summary, operationId)')
          .string('tag', 'Filter by tag')
          .string('entityName', 'Find operations related to an entity')
          .integer('limit', 'Maximum results to return', { default: 20 })
          .build(),
      },
      async (args) => this.handleSearchOperations(args as {
        specId: string;
        query?: string;
        tag?: string;
        entityName?: string;
        limit?: number;
      })
    );

    // Tool: listSchemas
    this.registerTool(
      {
        name: 'listSchemas',
        description: 'Lists all schemas/entities defined in the spec',
        inputSchema: createSchema()
          .string('specId', 'The spec ID', { required: true })
          .build(),
      },
      async (args) => this.handleListSchemas(args as { specId: string })
    );

    // Tool: unloadSpec
    this.registerTool(
      {
        name: 'unloadSpec',
        description: 'Unloads a previously loaded spec from memory',
        inputSchema: createSchema()
          .string('specId', 'The spec ID to unload', { required: true })
          .build(),
      },
      async (args) => this.handleUnloadSpec(args as { specId: string })
    );
  }

  protected async onInitialize(): Promise<void> {
    this.logger.info('OpenAPI MCP server initialized');
  }

  protected async onShutdown(): Promise<void> {
    this.loadedSpecs.clear();
    await this.auditLogger.close();
    this.logger.info('OpenAPI MCP server shutdown complete');
  }

  private async handleLoadSpec(args: { source: string; specId?: string }): Promise<{
    specId: string;
    title: string;
    version: string;
    endpointCount: number;
    schemaCount: number;
  }> {
    const correlationId = this.logger.newCorrelationId();

    try {
      const parsed = await this.specParser.parse(args.source);
      const specId = args.specId ?? `spec-${Date.now()}`;
      
      this.loadedSpecs.set(specId, parsed);

      await this.auditLogger.logFileAccess(correlationId, args.source, 'read', 'success');

      this.logger.info('OpenAPI spec loaded', {
        specId,
        source: args.source,
        title: parsed.info.title,
      });

      return {
        specId,
        title: parsed.info.title,
        version: parsed.info.version,
        endpointCount: parsed.endpoints.length,
        schemaCount: Object.keys(parsed.schemas).length,
      };
    } catch (error) {
      await this.auditLogger.logFileAccess(
        correlationId,
        args.source,
        'read',
        'failure',
        error instanceof Error ? error.message : 'Unknown error'
      );
      throw error;
    }
  }

  private async handleListEndpoints(args: {
    specId: string;
    tag?: string;
    pathPattern?: string;
    methods?: string[];
  }): Promise<{ endpoints: EndpointInfo[]; totalCount: number }> {
    const spec = this.getSpec(args.specId);
    
    let endpoints = spec.endpoints;

    // Apply filters
    if (args.tag) {
      endpoints = endpoints.filter((e) => e.tags?.includes(args.tag!));
    }

    if (args.pathPattern) {
      const regex = new RegExp(args.pathPattern);
      endpoints = endpoints.filter((e) => regex.test(e.path));
    }

    if (args.methods && args.methods.length > 0) {
      const methodsUpper = args.methods.map((m) => m.toUpperCase());
      endpoints = endpoints.filter((e) => methodsUpper.includes(e.method.toUpperCase()));
    }

    return {
      endpoints,
      totalCount: endpoints.length,
    };
  }

  private async handleGetEntitySchema(args: {
    specId: string;
    schemaName: string;
    resolveRefs?: boolean;
    includeExamples?: boolean;
  }): Promise<{ schema: EntitySchema | null }> {
    const spec = this.getSpec(args.specId);
    
    const schema = this.entityExtractor.extract(
      spec,
      args.schemaName,
      {
        resolveRefs: args.resolveRefs ?? true,
        includeExamples: args.includeExamples ?? true,
      }
    );

    return { schema };
  }

  private async handleGetOperationDetails(args: {
    specId: string;
    operationId?: string;
    path?: string;
    method?: string;
  }): Promise<{ operation: OperationDetails | null }> {
    const spec = this.getSpec(args.specId);

    if (args.operationId) {
      const operation = this.operationMapper.getByOperationId(spec, args.operationId);
      return { operation };
    }

    if (args.path && args.method) {
      const operation = this.operationMapper.getByPathMethod(
        spec,
        args.path,
        args.method.toUpperCase()
      );
      return { operation };
    }

    throw new Error('Either operationId or both path and method are required');
  }

  private async handleSearchOperations(args: {
    specId: string;
    query?: string;
    tag?: string;
    entityName?: string;
    limit?: number;
  }): Promise<{ operations: OperationDetails[]; totalCount: number }> {
    const spec = this.getSpec(args.specId);
    
    const results = this.operationMapper.search(spec, {
      query: args.query,
      tag: args.tag,
      entityName: args.entityName,
      limit: args.limit ?? 20,
    });

    return {
      operations: results,
      totalCount: results.length,
    };
  }

  private async handleListSchemas(args: { specId: string }): Promise<{
    schemas: Array<{ name: string; type: string; description?: string }>;
    totalCount: number;
  }> {
    const spec = this.getSpec(args.specId);
    
    const schemas = Object.entries(spec.schemas).map(([name, schema]) => ({
      name,
      type: (schema as Record<string, unknown>)['type'] as string ?? 'object',
      description: (schema as Record<string, unknown>)['description'] as string | undefined,
    }));

    return {
      schemas,
      totalCount: schemas.length,
    };
  }

  private async handleUnloadSpec(args: { specId: string }): Promise<{ success: boolean }> {
    const existed = this.loadedSpecs.delete(args.specId);
    this.logger.info('Spec unloaded', { specId: args.specId, existed });
    return { success: existed };
  }

  private getSpec(specId: string): ParsedSpec {
    const spec = this.loadedSpecs.get(specId);
    if (!spec) {
      throw new Error(`Spec not found: ${specId}. Use loadSpec first.`);
    }
    return spec;
  }
}
