/**
 * Type definitions for OpenAPI MCP.
 */

/**
 * Parsed OpenAPI specification.
 */
export interface ParsedSpec {
  /** OpenAPI version */
  openApiVersion: string;
  /** API info */
  info: ApiInfo;
  /** All endpoints */
  endpoints: EndpointInfo[];
  /** All schemas */
  schemas: Record<string, unknown>;
  /** Tags */
  tags: TagInfo[];
  /** Servers */
  servers: ServerInfo[];
  /** Raw spec for reference */
  raw: unknown;
}

/**
 * API information.
 */
export interface ApiInfo {
  title: string;
  version: string;
  description?: string;
  contact?: {
    name?: string;
    email?: string;
    url?: string;
  };
}

/**
 * Endpoint information.
 */
export interface EndpointInfo {
  /** HTTP method */
  method: string;
  /** Path template */
  path: string;
  /** Operation ID */
  operationId?: string;
  /** Summary */
  summary?: string;
  /** Description */
  description?: string;
  /** Tags */
  tags?: string[];
  /** Whether deprecated */
  deprecated?: boolean;
}

/**
 * Tag information.
 */
export interface TagInfo {
  name: string;
  description?: string;
}

/**
 * Server information.
 */
export interface ServerInfo {
  url: string;
  description?: string;
}

/**
 * Extracted entity schema.
 */
export interface EntitySchema {
  /** Entity name */
  name: string;
  /** Schema type */
  type: string;
  /** Description */
  description?: string;
  /** Properties */
  properties: PropertyInfo[];
  /** Required property names */
  required: string[];
  /** Key fields (for IFS entities) */
  keys?: string[];
  /** Example values */
  examples?: Record<string, unknown>;
}

/**
 * Property information.
 */
export interface PropertyInfo {
  /** Property name */
  name: string;
  /** Data type */
  type: string;
  /** Format (e.g., date-time, uuid) */
  format?: string;
  /** Description */
  description?: string;
  /** Whether required */
  required: boolean;
  /** Whether nullable */
  nullable?: boolean;
  /** Enum values */
  enum?: (string | number)[];
  /** Default value */
  default?: unknown;
  /** Example value */
  example?: unknown;
  /** Nested schema (for objects/arrays) */
  items?: PropertyInfo;
  /** Min/max constraints */
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  /** Pattern */
  pattern?: string;
}

/**
 * Operation details.
 */
export interface OperationDetails {
  /** Operation ID */
  operationId?: string;
  /** HTTP method */
  method: string;
  /** Path template */
  path: string;
  /** Summary */
  summary?: string;
  /** Description */
  description?: string;
  /** Tags */
  tags?: string[];
  /** Path parameters */
  pathParameters: ParameterInfo[];
  /** Query parameters */
  queryParameters: ParameterInfo[];
  /** Header parameters */
  headerParameters: ParameterInfo[];
  /** Request body */
  requestBody?: RequestBodyInfo;
  /** Responses */
  responses: ResponseInfo[];
  /** Security requirements */
  security?: SecurityRequirement[];
}

/**
 * Parameter information.
 */
export interface ParameterInfo {
  /** Parameter name */
  name: string;
  /** Location (path, query, header) */
  in: 'path' | 'query' | 'header';
  /** Description */
  description?: string;
  /** Whether required */
  required: boolean;
  /** Data type */
  type: string;
  /** Format */
  format?: string;
  /** Example */
  example?: unknown;
  /** Enum values */
  enum?: (string | number)[];
  /** Default value */
  default?: unknown;
}

/**
 * Request body information.
 */
export interface RequestBodyInfo {
  /** Description */
  description?: string;
  /** Whether required */
  required: boolean;
  /** Content types and schemas */
  content: ContentTypeInfo[];
}

/**
 * Content type information.
 */
export interface ContentTypeInfo {
  /** Media type */
  mediaType: string;
  /** Schema */
  schema?: Record<string, unknown>;
  /** Example */
  example?: unknown;
}

/**
 * Response information.
 */
export interface ResponseInfo {
  /** Status code */
  statusCode: string;
  /** Description */
  description?: string;
  /** Content types */
  content?: ContentTypeInfo[];
  /** Headers */
  headers?: Record<string, ParameterInfo>;
}

/**
 * Security requirement.
 */
export interface SecurityRequirement {
  /** Scheme name */
  name: string;
  /** Scopes */
  scopes: string[];
}
