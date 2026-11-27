'use client';

import React, { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { Box, Container, Paper, Alert, CircularProgress, Typography } from '@mui/material';
import { JSONSchemaForm } from '@/components/Forms/JSONSchemaForm';
import { getJSONSchema } from '@/utils/schema/schemaRegistry';
import { ExtendedJSONSchema } from '@/shared/interfaces';
import { createGenericLayerService } from '@/api/genericLayerService';
import { useApp } from "@/contexts/AppContext";

interface DynamicSchemaPageProps {
  params: Promise<{
    schema: string;
  }>;
}

export default function DynamicSchemaPage(props: DynamicSchemaPageProps) {
  const params = use(props.params);
  const router = useRouter();
  const [schema, setSchema] = useState<ExtendedJSONSchema | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [menuItem, setMenuItem] = useState<any>(null);
  const [service] = useState(() => createGenericLayerService(params.schema));
  const { showToast, showToastAfterNavigation } = useApp();

  const schemaType = params.schema;

  useEffect(() => {
    const loadSchema = async () => {
      try {
        setLoading(true);
        setError(null);

        const loadedSchema = await getJSONSchema(schemaType);
        setSchema(loadedSchema);

        setMenuItem({ name: loadedSchema.title || schemaType.toUpperCase() } as any);
      } catch (err) {
        console.error(`❌ Failed to load schema for type: ${schemaType}`, err);
        let errorMessage = 'Unknown error occurred';
        if (err instanceof Error) {
          errorMessage = err.message;
        }

        setError(`Failed to load schema for "${schemaType}": ${errorMessage}`);
      } finally {
        setLoading(false);
      }
    };

    loadSchema();
  }, [schemaType]);

  const handleSubmit = async (formData: Record<string, any>) => {
    try {
      setSubmitting(true);

      // Validation is now on by default (no parameter needed)
      const createdLayers = await service.addRange([formData as any]);
      const createdLayer = createdLayers[0];

      showToastAfterNavigation(`${menuItem?.name || schemaType} layer created successfully!`, "success");

      router.push(`/layers/${schemaType}`);

    } catch (err: any) {
      console.error(`❌ Failed to save ${schemaType} layer:`, err);
      
      // Check if this is a validation error from the backend
      if (err.response?.status === 400 && err.response?.data?.validationErrors) {
        const validationErrors = err.response.data.validationErrors;
        const errorMessages = validationErrors
          .map((e: any) => `${e.field}: ${e.message}`)
          .join('\n');
        showToast(`Validation failed:\n${errorMessages}`, "error");
      } else {
        showToast(`Failed to save ${schemaType} layer. Please try again.`, "error");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    router.push(`/layers/${schemaType}`);
  };

  if (loading) {
    return (
      <Container maxWidth="md">
        <Box
          display="flex"
          flexDirection="column"
          justifyContent="center"
          alignItems="center"
          minHeight="400px"
          gap={2}
        >
          <CircularProgress />
          <Typography variant="body1" color="text.secondary">
            Loading {schemaType} form schema...
          </Typography>
        </Box>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="md">
        <Box mt={4}>
          <Alert severity="error" sx={{ mb: 2 }}>
            <Typography variant="h6" component="div" gutterBottom>
              Failed to Load Form
            </Typography>
            {error}
          </Alert>
        </Box>
      </Container>
    );
  }

  if (!schema) {
    return (
      <Container maxWidth="md">
        <Box mt={4}>
          <Alert severity="warning">
            Schema loaded but is empty or invalid.
          </Alert>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="md">
      <Box mt={4} mb={4}>
        <Paper elevation={1} sx={{ p: 4, mt: 10 }}>
          <JSONSchemaForm
            schema={schema}
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            loading={submitting}
            submitText={`Create ${menuItem?.name || 'Layer'}`}
            cancelText="Cancel"
          />
        </Paper>
      </Box>
    </Container>
  );
}