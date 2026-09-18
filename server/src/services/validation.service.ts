import { z } from "zod";
import { JsonSchemaService } from "./jsonSchema.service";
import { jsonSchemaToZod } from "../utils/jsonSchemaToZod";
import { ExtendedJSONSchema } from "@/shared/interfaces";

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface ValidationResult {
  valid: boolean;
  errors?: ValidationError[];
}

class ValidationService {
  private jsonSchemaService: JsonSchemaService;
  private schemaCache: Map<string, z.ZodSchema>;

  constructor() {
    this.jsonSchemaService = new JsonSchemaService();
    this.schemaCache = new Map();
  }

  /**
   * Validates layer data against its JSON schema
   * @param layerType - The type of layer (e.g., 'geojson', 'gpx')
   * @param layerData - The layer data to validate
   * @returns ValidationResult with success status and any errors
   */
  async validateLayerData(
    layerType: string,
    layerData: any
  ): Promise<ValidationResult> {
    try {
      // Fetch schema from database
      const schemaDto = await this.jsonSchemaService.findByName(
        layerType.toLowerCase()
      );

      if (!schemaDto) {
        if (["wms", "wmts", "wfs"].includes(layerType.toLowerCase())) {
          // backwards compatibility for legacy layer types without schemas
          return {
            valid: true,
          };
        }

        return {
          valid: false,
          errors: [
            {
              field: "_schema",
              message: `No schema found for layer type "${layerType}"`,
              code: "schema_not_found",
            },
          ],
        };
      }

      const jsonSchema = schemaDto.schemaContent as ExtendedJSONSchema;

      // Get or create Zod schema (with caching)
      const zodSchema = this.getOrCreateZodSchema(layerType, jsonSchema);

      // Validate the data
      const result = zodSchema.safeParse(layerData);

      if (result.success) {
        return { valid: true };
      }

      // Format Zod errors into user-friendly format
      return {
        valid: false,
        errors: this.formatZodErrors(result.error),
      };
    } catch (error) {
      console.error(`[ValidationService] Error validating layer data:`, error);
      return {
        valid: false,
        errors: [
          {
            field: "_validation",
            message:
              error instanceof Error
                ? error.message
                : "Validation failed due to an unexpected error",
            code: "validation_error",
          },
        ],
      };
    }
  }

  /**
   * Gets cached Zod schema or creates and caches a new one
   */
  private getOrCreateZodSchema(
    layerType: string,
    jsonSchema: ExtendedJSONSchema
  ): z.ZodSchema {
    const cacheKey = layerType.toLowerCase();

    if (this.schemaCache.has(cacheKey)) {
      return this.schemaCache.get(cacheKey)!;
    }

    try {
      const zodSchema = jsonSchemaToZod(jsonSchema);
      this.schemaCache.set(cacheKey, zodSchema);
      return zodSchema;
    } catch (error) {
      console.error(
        `[ValidationService] Error converting schema to Zod:`,
        error
      );
      throw new Error(
        `Failed to convert JSON Schema to validation schema: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * Formats Zod errors into a user-friendly structure
   */
  private formatZodErrors(zodError: z.ZodError): ValidationError[] {
    return zodError.issues.map((err: any) => ({
      field: err.path.length > 0 ? err.path.join(".") : "_root",
      message: err.message,
      code: err.code,
    }));
  }

  /**
   * Clears the schema cache (useful when schemas are updated)
   */
  clearCache(layerType?: string): void {
    if (layerType) {
      this.schemaCache.delete(layerType.toLowerCase());
    } else {
      this.schemaCache.clear();
    }
  }
}

export { ValidationService };

