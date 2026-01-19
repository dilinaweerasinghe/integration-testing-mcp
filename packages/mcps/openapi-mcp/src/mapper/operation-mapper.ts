/**
 * Operation mapper for extracting detailed operation information.
 */

import type { OpenAPIV3 } from 'openapi-types';
import type {
  ParsedSpec,
  OperationDetails,
  ParameterInfo,
  RequestBodyInfo,
  ResponseInfo,
  ContentTypeInfo,
} from '../types.js';

interface SearchOptions {
  query?: string;
  tag?: string;
  entityName?: string;
  limit: number;
}

type Operation = OpenAPIV3.OperationObject;
type Parameter = OpenAPIV3.ParameterObject;
type RequestBody = OpenAPIV3.RequestBodyObject;
type Response = OpenAPIV3.ResponseObject;
type MediaType = OpenAPIV3.MediaTypeObject;

/**
 * Maps OpenAPI operations to detailed internal format.
 */
export class OperationMapper {
  /**
   * Get operation by operationId.
   */
  getByOperationId(spec: ParsedSpec, operationId: string): OperationDetails | null {
    const endpoint = spec.endpoints.find((e) => e.operationId === operationId);
    if (!endpoint) {
      return null;
    }

    return this.getByPathMethod(spec, endpoint.path, endpoint.method);
  }

  /**
   * Get operation by path and method.
   */
  getByPathMethod(spec: ParsedSpec, path: string, method: string): OperationDetails | null {
    const paths = (spec.raw as OpenAPIV3.Document).paths;
    if (!paths) {
      return null;
    }

    const pathItem = paths[path];
    if (!pathItem) {
      return null;
    }

    const operation = pathItem[method.toLowerCase() as keyof typeof pathItem] as Operation | undefined;
    if (!operation) {
      return null;
    }

    return this.mapOperation(path, method.toUpperCase(), operation, pathItem);
  }

  /**
   * Search operations by criteria.
   */
  search(spec: ParsedSpec, options: SearchOptions): OperationDetails[] {
    const results: OperationDetails[] = [];
    const paths = (spec.raw as OpenAPIV3.Document).paths;
    
    if (!paths) {
      return results;
    }

    const queryLower = options.query?.toLowerCase();
    const entityLower = options.entityName?.toLowerCase();

    for (const endpoint of spec.endpoints) {
      // Apply filters
      if (options.tag && !endpoint.tags?.includes(options.tag)) {
        continue;
      }

      if (queryLower) {
        const searchText = [
          endpoint.operationId,
          endpoint.summary,
          endpoint.description,
          endpoint.path,
        ].filter(Boolean).join(' ').toLowerCase();

        if (!searchText.includes(queryLower)) {
          continue;
        }
      }

      if (entityLower) {
        const pathLower = endpoint.path.toLowerCase();
        if (!pathLower.includes(entityLower)) {
          continue;
        }
      }

      const operation = this.getByPathMethod(spec, endpoint.path, endpoint.method);
      if (operation) {
        results.push(operation);
      }

      if (results.length >= options.limit) {
        break;
      }
    }

    return results;
  }

  /**
   * Map an operation to OperationDetails.
   */
  private mapOperation(
    path: string,
    method: string,
    operation: Operation,
    pathItem: OpenAPIV3.PathItemObject
  ): OperationDetails {
    // Combine path-level and operation-level parameters
    const allParams = [
      ...(pathItem.parameters ?? []),
      ...(operation.parameters ?? []),
    ] as Parameter[];

    const pathParameters = this.filterParameters(allParams, 'path');
    const queryParameters = this.filterParameters(allParams, 'query');
    const headerParameters = this.filterParameters(allParams, 'header');

    return {
      operationId: operation.operationId,
      method,
      path,
      summary: operation.summary,
      description: operation.description,
      tags: operation.tags,
      pathParameters,
      queryParameters,
      headerParameters,
      requestBody: operation.requestBody
        ? this.mapRequestBody(operation.requestBody as RequestBody)
        : undefined,
      responses: this.mapResponses(operation.responses),
      security: operation.security?.map((sec) => {
        const [name, scopes] = Object.entries(sec)[0] ?? ['unknown', []];
        return { name, scopes: scopes ?? [] };
      }),
    };
  }

  /**
   * Filter parameters by location.
   */
  private filterParameters(
    params: Parameter[],
    location: 'path' | 'query' | 'header'
  ): ParameterInfo[] {
    return params
      .filter((p) => p.in === location)
      .map((p) => this.mapParameter(p));
  }

  /**
   * Map a parameter to ParameterInfo.
   */
  private mapParameter(param: Parameter): ParameterInfo {
    const schema = param.schema as OpenAPIV3.SchemaObject | undefined;

    return {
      name: param.name,
      in: param.in as 'path' | 'query' | 'header',
      description: param.description,
      required: param.required ?? false,
      type: schema?.type ?? 'string',
      format: schema?.format,
      example: param.example ?? schema?.example,
      enum: schema?.enum as (string | number)[] | undefined,
      default: schema?.default,
    };
  }

  /**
   * Map request body to RequestBodyInfo.
   */
  private mapRequestBody(requestBody: RequestBody): RequestBodyInfo {
    return {
      description: requestBody.description,
      required: requestBody.required ?? false,
      content: this.mapContent(requestBody.content),
    };
  }

  /**
   * Map content types.
   */
  private mapContent(
    content: Record<string, MediaType> | undefined
  ): ContentTypeInfo[] {
    if (!content) {
      return [];
    }

    return Object.entries(content).map(([mediaType, mediaTypeObj]) => ({
      mediaType,
      schema: mediaTypeObj.schema as Record<string, unknown> | undefined,
      example: mediaTypeObj.example,
    }));
  }

  /**
   * Map responses to ResponseInfo array.
   */
  private mapResponses(
    responses: OpenAPIV3.ResponsesObject | undefined
  ): ResponseInfo[] {
    if (!responses) {
      return [];
    }

    return Object.entries(responses).map(([statusCode, response]) => {
      const resp = response as Response;
      return {
        statusCode,
        description: resp.description,
        content: this.mapContent(resp.content),
        headers: resp.headers
          ? Object.fromEntries(
              Object.entries(resp.headers).map(([name, header]) => [
                name,
                this.mapParameter({
                  ...(header as OpenAPIV3.HeaderObject),
                  name,
                  in: 'header',
                } as Parameter),
              ])
            )
          : undefined,
      };
    });
  }
}
