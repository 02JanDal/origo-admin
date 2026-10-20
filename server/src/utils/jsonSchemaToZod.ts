import { z } from "zod";
import { ExtendedJSONSchema } from "@/shared/interfaces";

export function jsonSchemaToZod(schema: ExtendedJSONSchema): z.ZodSchema<any> {
  return convertSchemaProperty(schema);
}

function convertSchemaProperty(property: ExtendedJSONSchema): z.ZodSchema<any> {
  if (property.oneOf) {
    const schemas = property.oneOf.map((schema) =>
      convertSchemaProperty(schema)
    );
    return z.union(schemas as [z.ZodSchema, z.ZodSchema, ...z.ZodSchema[]]);
  }

  if (property.anyOf) {
    const schemas = property.anyOf.map((schema) =>
      convertSchemaProperty(schema)
    );
    return z.union(schemas as [z.ZodSchema, z.ZodSchema, ...z.ZodSchema[]]);
  }

  switch (property.type) {
    case "string":
      return convertStringSchema(property);

    case "number":
    case "integer":
      return convertNumberSchema(property);

    case "boolean":
      return z.boolean();

    case "array":
      return convertArraySchema(property);

    case "object":
      return convertObjectSchema(property);

    default:
      return z.any();
  }
}

function convertStringSchema(property: ExtendedJSONSchema): z.ZodTypeAny {
  let schema = z.string();

  if (typeof property.minLength === "number") {
    schema = schema.min(property.minLength, {
      message: `Must be at least ${property.minLength} characters`,
    });
  }

  if (typeof property.maxLength === "number") {
    schema = schema.max(property.maxLength, {
      message: `Must be at most ${property.maxLength} characters`,
    });
  }

  if (property.pattern) {
    schema = schema.regex(new RegExp(property.pattern), {
      message: `Must match pattern: ${property.pattern}`,
    });
  }

  if (property.format) {
    switch (property.format) {
      case "email":
        schema = schema.email({ message: "Must be a valid email address" });
        break;
      case "uri":
      case "url":
        schema = schema.url({ message: "Must be a valid URL" });
        break;
      case "date":
        schema = schema.datetime({ message: "Must be a valid date" });
        break;
    }
  }

  if (property.enum && Array.isArray(property.enum)) {
    const enumValues = property.enum as string[];
    if (enumValues.length > 0) {
      return z.enum(enumValues as [string, ...string[]]);
    }
  }

  if (property.const !== undefined) {
    return z.literal(property.const as string);
  }

  return schema;
}

function convertNumberSchema(property: ExtendedJSONSchema): z.ZodTypeAny {
  // Start with base number schema
  let numberSchema = z.number({
    message: "Must be a number",
  });

  // Apply min/max constraints
  if (typeof property.minimum === "number") {
    numberSchema = numberSchema.min(property.minimum, {
      message: `Must be at least ${property.minimum}`,
    });
  }

  if (typeof property.maximum === "number") {
    numberSchema = numberSchema.max(property.maximum, {
      message: `Must be at most ${property.maximum}`,
    });
  }

  if (property.type === "integer") {
    numberSchema = numberSchema.int({ message: "Must be an integer" });
  }

  // Wrap with union that handles string-to-number conversion
  const schema = z.union([
    numberSchema,
    z
      .string()
      .transform((val, ctx) => {
        // Reject empty strings explicitly
        if (val === "") {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Must be a number (empty string not allowed)",
          });
          return z.NEVER;
        }
        // Try to parse as number
        const num = Number(val);
        if (isNaN(num)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Must be a valid number",
          });
          return z.NEVER;
        }
        return num;
      })
      .pipe(numberSchema),
  ]);

  return schema;
}

function convertArraySchema(property: ExtendedJSONSchema): z.ZodArray<any> {
  let itemSchema: z.ZodSchema<any>;

  if (property.items) {
    if (Array.isArray(property.items)) {
      itemSchema = z.any();
    } else {
      itemSchema = convertSchemaProperty(property.items);
    }
  } else {
    itemSchema = z.any();
  }

  let schema = z.array(itemSchema);

  if (typeof property.minItems === "number") {
    schema = schema.min(property.minItems, {
      message: `Must have at least ${property.minItems} items`,
    });
  }

  if (typeof property.maxItems === "number") {
    schema = schema.max(property.maxItems, {
      message: `Must have at most ${property.maxItems} items`,
    });
  }

  return schema;
}

function convertObjectSchema(property: ExtendedJSONSchema): z.ZodTypeAny {
  const shape: Record<string, z.ZodSchema<any>> = {};

  // Handle defined properties
  if (property.properties) {
    Object.entries(property.properties).forEach(([key, propSchema]) => {
      let fieldSchema = convertSchemaProperty(propSchema);

      const isRequired = property.required?.includes(key) ?? false;

      // Optional fields must also accept null: the form explicitly converts
      // every blank/undefined field to null before submission (see
      // JSONSchemaForm.tsx's undefinedToNull), so .optional() alone (which
      // only accepts undefined) would reject those submissions.
      if (propSchema["x-validation"]?.requiredIf && !isRequired) {
        fieldSchema = fieldSchema.nullable().optional();
      } else if (!isRequired) {
        fieldSchema = fieldSchema.nullable().optional();
      }

      if (propSchema.default !== undefined) {
        fieldSchema = fieldSchema.default(propSchema.default);
      }

      shape[key] = fieldSchema;
    });
  }

  let schema = z.object(shape);

  // Handle additionalProperties
  if (property.additionalProperties === false) {
    // Strict mode - no additional properties allowed
    schema = schema.strict();
  } else if (
    property.additionalProperties === true ||
    property.additionalProperties === undefined
  ) {
    // Allow any additional properties
    schema = schema.passthrough();
  } else if (typeof property.additionalProperties === "object") {
    // Additional properties must match a specific schema
    const additionalSchema = convertSchemaProperty(
      property.additionalProperties as ExtendedJSONSchema
    );
    schema = schema.passthrough().superRefine((val, ctx) => {
      const knownKeys = Object.keys(shape);
      Object.entries(val).forEach(([key, value]) => {
        if (!knownKeys.includes(key)) {
          const result = additionalSchema.safeParse(value);
          if (!result.success) {
            result.error.issues.forEach((err: any) => {
              ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: [key, ...err.path],
                message: `"${key}": ${err.message}`,
              });
            });
          }
        }
      });
    });
  }

  // Handle patternProperties (JSON Schema feature)
  if (property.patternProperties) {
    const patternProps = property.patternProperties as Record<
      string,
      ExtendedJSONSchema
    >;

    schema = schema.passthrough().superRefine((val, ctx) => {
      const knownKeys = Object.keys(shape);

      Object.entries(val).forEach(([key, value]) => {
        // Skip validation for explicitly defined properties
        if (knownKeys.includes(key)) return;

        let matchedPattern = false;

        // Check each pattern
        for (const [pattern, patternSchema] of Object.entries(patternProps)) {
          const regex = new RegExp(pattern);
          if (regex.test(key)) {
            matchedPattern = true;
            const patternZodSchema = convertSchemaProperty(patternSchema);
            const result = patternZodSchema.safeParse(value);

            if (!result.success) {
              result.error.issues.forEach((err: any) => {
                const pathStr =
                  err.path.length > 0 ? `.${err.path.join(".")}` : "";
                ctx.addIssue({
                  code: z.ZodIssueCode.custom,
                  path: [key, ...err.path],
                  message: `"${key}${pathStr}": ${err.message}`,
                });
              });
            }
            break; // Stop after first matching pattern
          }
        }

        // If no pattern matched, check if key format is invalid
        if (!matchedPattern && property.additionalProperties === false) {
          const patterns = Object.keys(patternProps);
          if (patterns.length > 0) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              path: [key],
              message: `Key "${key}" does not match required pattern: ${patterns[0]}`,
            });
          } else {
            ctx.addIssue({
              code: z.ZodIssueCode.unrecognized_keys,
              keys: [key],
              path: [],
              message: `Unknown key: "${key}"`,
            });
          }
        }
      });
    });
  }

  return schema;
}

export function formatZodError(error: z.ZodError): Record<string, string> {
  const errorMap: Record<string, string> = {};

  error.issues.forEach((err: any) => {
    const path = err.path.join(".");
    errorMap[path] = err.message;
  });

  return errorMap;
}

