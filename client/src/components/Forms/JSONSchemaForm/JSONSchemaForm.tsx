import React, { useMemo } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Box,
  Button,
  GridLegacy as Grid,
  Typography,
  CircularProgress,
  Alert,
  LinearProgress,
  Chip,
  Paper,
} from '@mui/material';
import { JSONSchemaFormProps } from './types';
import { Field } from './Field';
import { jsonSchemaToZod } from '@/utils/schema/jsonSchemaToZod';
import { ExtendedJSONSchema } from "@/shared/interfaces";
import { parseFieldSections } from './utils/sectionParser';
import { createFieldGroups, FieldGroup } from './utils/fieldGrouper';
import { calculateFormStats } from './utils/formStatsCalculator';
import { FormSection } from './components/FormSection';
import { FieldGroupComponent } from './components/FieldGroup';

// Helper functions for form UI feedback
const pluralize = (count: number, word: string): string =>
  `${count} ${word}${count !== 1 ? 's' : ''}`;

const getFormStatusMessage = (errorCount: number, completion: number, requiredFields: number, filledRequired: number): string => {
  if (errorCount > 0) {
    return `Please fix ${pluralize(errorCount, 'error')} before submitting`;
  }
  if (completion === 100) {
    return 'All required fields completed - ready to submit!';
  }
  const remaining = requiredFields - filledRequired;
  return `${pluralize(remaining, 'required field')} remaining`;
};

const getProgressColor = (errorCount: number, completion: number): string => {
  if (errorCount > 0) return 'warning.main';
  if (completion === 100) return 'success.main';
  return 'primary.main';
};

const getButtonColors = (errorCount: number) => ({
  main: errorCount > 0 ? 'warning.main' : 'primary.main',
  hover: errorCount > 0 ? 'warning.dark' : 'primary.dark'
});

export const JSONSchemaForm: React.FC<JSONSchemaFormProps> = ({
  schema,
  initialValues = {},
  onSubmit,
  onCancel,
  loading = false,
  submitText = 'Save',
  cancelText = 'Cancel',
}) => {
  // Merge initial values with schema defaults
  const defaultValues = useMemo(() => {
    const values: Record<string, any> = { ...initialValues };

    if (schema.properties) {
      Object.entries(schema.properties).forEach(([key, property]) => {
        // Replace API-select objects with their names (string)
        if (values[key] !== null && typeof values[key] === 'object' && property['x-ui']?.component === 'api-select' && property['x-datasource']?.valueField) {
          values[key] = values[key][property['x-datasource'].valueField];
        }
        else if ((values[key] === undefined || values[key] === null) && property.default !== undefined) {
          values[key] = property.default;
        }
      });
    }
    return values;
  }, [schema, initialValues]);

  // Convert JSON Schema to Zod for validation
  const zodSchema = useMemo(() => {
    try {
      return jsonSchemaToZod(schema);
    } catch (error) {
      console.error('Failed to convert JSON Schema to Zod:', error);
      return null;
    }
  }, [schema]);

  // Setup react-hook-form with Zod validation
  const {
    control,
    handleSubmit,
    formState: { errors, isValid, isDirty },
    watch,
  } = useForm({
    resolver: zodSchema ? zodResolver(zodSchema) : undefined,
    defaultValues: defaultValues,
    mode: 'onChange',
  });

  const formValues = watch();

  // Calculate form completion and validation stats (based on required fields)
  const formStats = useMemo(() => {
    return calculateFormStats(
      schema.properties || {},
      formValues,
      errors,
      schema.required || []
    );
  }, [schema.properties, formValues, errors, schema.required]);

  const buttonColors = getButtonColors(formStats.errorCount);

  // Convert undefined to null recursively for nested objects/arrays
  const undefinedToNull = <T,>(input: T): T => {
    if (input === undefined) return null as unknown as T;
    if (input === null || typeof input !== "object") return input;

    if (Array.isArray(input)) {
      return input.map((v) => undefinedToNull(v)) as unknown as T;
    }

    const obj = input as Record<string, unknown>;
    const out: Record<string, unknown> = {};

    for (const [k, v] of Object.entries(obj)) {
      out[k] = v === undefined ? null : undefinedToNull(v);
    }

    return out as T;
  };

  // Change undefined to null before submission to explicitly include null values in the request body
  const onFormSubmit = (data: Record<string, any>) => {
    const cleanedData = undefinedToNull(data);
    onSubmit(cleanedData);
  };

  if (!zodSchema) {
    return (
      <Alert severity="error">
        Failed to process form schema. Please check the schema format.
      </Alert>
    );
  }

  // Parse schema into organized sections with their assigned fields
  const fieldSections = useMemo(() => {
    return parseFieldSections(schema);
  }, [schema]);

  // Helper to format nested error messages for objects
  const formatNestedErrors = (error: any): string | undefined => {
    if (!error) return undefined;

    // If it's a simple string message, return it
    if (typeof error.message === 'string') {
      return error.message;
    }

    // If it's a nested object error, collect all nested messages
    const messages: string[] = [];

    const collectErrors = (obj: any, prefix = '') => {
      if (obj && typeof obj === 'object') {
        if (obj.message && typeof obj.message === 'string') {
          messages.push(prefix ? `"${prefix}": ${obj.message}` : obj.message);
        }

        // Recurse through nested properties
        Object.keys(obj).forEach(key => {
          if (key !== 'message' && key !== 'type' && key !== 'ref') {
            const newPrefix = prefix ? `${prefix}.${key}` : key;
            collectErrors(obj[key], newPrefix);
          }
        });
      }
    };

    collectErrors(error, '');
    return messages.length > 0 ? messages.join('\n') : undefined;
  };

  // Render a single field with react-hook-form Controller
  const renderField = (
    fieldName: string,
    fieldSchema: ExtendedJSONSchema,
    groupType: FieldGroup['type'],
    fieldsInGroup: number
  ) => {
    const fieldError = formatNestedErrors(errors[fieldName]);

    return (
      <Controller
        key={fieldName}
        name={fieldName}
        control={control}
        render={({ field: { onChange, onBlur, value, name } }) => (
          <Box sx={{ display: fieldSchema['x-ui']?.hide ? 'none' : 'block' }}>
            <Field
              name={name}
              schema={fieldSchema}
              value={value}
              onChange={onChange}
              onBlur={onBlur}
              error={fieldError}
              disabled={loading}
            />
          </Box>
        )}
      />
    );
  };

  // Render all sections with their field groups
  const renderFields = () => {
    if (!schema.properties) {
      return (
        <Alert severity="warning">
          No form fields defined in schema.
        </Alert>
      );
    }

    return fieldSections.map((section, sectionIndex) => {
      if (!section) return null;

      const fieldGroups = createFieldGroups(section.fields);

      const sectionContent = (
        <Grid container spacing={2}>
          {fieldGroups.map((group, groupIndex) => (
            <FieldGroupComponent
              key={`group-${sectionIndex}-${groupIndex}`}
              group={group}
              renderField={renderField}
              groupIndex={groupIndex}
              sectionIndex={sectionIndex}
            />
          ))}
        </Grid>
      );

      return (
        <FormSection
          key={section.title}
          title={section.title}
          description={section.description}
          collapsible={section.collapsible}
          defaultCollapsed={section.defaultCollapsed}
        >
          {sectionContent}
        </FormSection>
      );
    });
  };

  return (
    <Box component="form" onSubmit={handleSubmit(onFormSubmit)} noValidate>
      {schema.title && (
        <Typography variant="h4" component="h1" gutterBottom>
          {schema.title}
        </Typography>
      )}

      {schema.description && (
        <Typography variant="body1" color="text.secondary" paragraph>
          {schema.description}
        </Typography>
      )}

      <Paper elevation={0} sx={{ p: { xs: 2, sm: 3 }, mb: 3, bgcolor: 'grey.50', borderRadius: 2 }}>
        <Box sx={{
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          alignItems: { xs: 'flex-start', sm: 'center' },
          justifyContent: 'space-between',
          gap: { xs: 2, sm: 0 },
          mb: 2
        }}>
          <Typography variant="subtitle2" color="text.primary">
            Form Progress
          </Typography>
          <Box sx={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 1,
            alignSelf: { xs: 'stretch', sm: 'auto' }
          }}>
            <Chip
              label={`${formStats.completion}% Complete`}
              color={formStats.completion === 100 ? 'success' : 'primary'}
              size="small"
            />
            <Chip
              label={`${formStats.filledRequired}/${formStats.requiredFields} Required`}
              variant="outlined"
              size="small"
            />
            {formStats.errorCount > 0 && (
              <Chip
                label={pluralize(formStats.errorCount, 'Error')}
                color="error"
                size="small"
              />
            )}
          </Box>
        </Box>
        <LinearProgress
          variant="determinate"
          value={formStats.completion}
          sx={{
            height: 8,
            borderRadius: 4,
            backgroundColor: 'grey.200',
            '& .MuiLinearProgress-bar': {
              borderRadius: 4,
              backgroundColor: getProgressColor(formStats.errorCount, formStats.completion)
            }
          }}
        />
      </Paper>

      <Grid container spacing={2}>
        {renderFields()}
      </Grid>

      <Paper elevation={0} sx={{ p: { xs: 2, sm: 3 }, mt: 3, bgcolor: 'grey.50', borderRadius: 2 }}>
        <Box sx={{
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          justifyContent: 'space-between',
          alignItems: { xs: 'stretch', sm: 'center' },
          gap: { xs: 2, sm: 0 }
        }}>
          <Box sx={{ textAlign: { xs: 'center', sm: 'left' } }}>
            <Typography variant="body2" color="text.secondary">
              {getFormStatusMessage(formStats.errorCount, formStats.completion, formStats.requiredFields, formStats.filledRequired)}
            </Typography>
          </Box>

          <Box sx={{
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            gap: 2,
            alignItems: 'center'
          }}>
            <Chip
              label={isDirty ? 'Unsaved changes' : 'All changes saved'}
              color={isDirty ? 'warning' : 'success'}
              variant="outlined"
              size="small"
              sx={{ display: { xs: 'none', sm: 'flex' } }}
            />

            {onCancel && (
              <Button
                variant="outlined"
                onClick={onCancel}
                disabled={loading}
                sx={{
                  minWidth: { xs: '100%', sm: 100 },
                  order: { xs: 2, sm: 1 }
                }}
              >
                {cancelText}
              </Button>
            )}

            <Button
              type="submit"
              variant="contained"
              disabled={loading || !isValid}
              startIcon={loading ? <CircularProgress size={20} /> : undefined}
              sx={{
                minWidth: { xs: '100%', sm: 140 },
                order: { xs: 1, sm: 2 },
                bgcolor: buttonColors.main,
                '&:hover': {
                  bgcolor: buttonColors.hover,
                }
              }}
            >
              {loading ? 'Saving...' : submitText}
            </Button>
          </Box>
        </Box>
      </Paper>
    </Box>
  );
};
