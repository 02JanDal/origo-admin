'use client';

import React, { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { Box, Container, Paper, Alert, CircularProgress, Typography } from '@mui/material';
import { JSONSchemaForm } from '@/components/Forms/JSONSchemaForm';
import { getJSONSchema } from '@/utils/schema/schemaRegistry';
import { ExtendedJSONSchema } from '@/shared/interfaces';
import { createGenericLayerService } from '@/api/genericLayerService';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useApp } from "@/contexts/AppContext";

interface GenericSchemaEditPageProps {
  params: Promise<{
    schema: string;
    id: string;
  }>;
}

export default function GenericSchemaEditPage(props: GenericSchemaEditPageProps) {
  const params = use(props.params);
  const router = useRouter();
  const [schema, setSchema] = useState<ExtendedJSONSchema | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [menuItem, setMenuItem] = useState<any>(null);
  // Use real generic layer service with schema type
  const [service] = useState(() => createGenericLayerService(params.schema));
  const { showToast, showToastAfterNavigation } = useApp();

  const schemaType = params.schema;
  const layerId = params.id;

  const queryClient = useQueryClient();
  const { data: layerData, isLoading: isLoadingLayer, error: layerError } = useQuery({
    queryKey: [`${schemaType}Layer`, layerId],
    queryFn: () => service.fetch(layerId),
    enabled: !!layerId
  });

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
      await service.update(layerId, formData as any);

      showToastAfterNavigation(`${menuItem?.name || schemaType} layer updated successfully!`, "success");

      router.push(`/layers/${schemaType}`);

    } catch (err: any) {
      console.error(`❌ Failed to update ${schemaType} layer:`, err);

      // Check if this is a validation error from the backend
      if (err.response?.status === 400 && err.response?.data?.validationErrors) {
        const validationErrors = err.response.data.validationErrors;
        const errorMessages = validationErrors
          .map((e: any) => `${e.field}: ${e.message}`)
          .join('\n');
        showToast(`Validation failed:\n${errorMessages}`, "error");
      } else {
        showToast(`Failed to update ${schemaType} layer. Please try again.`, "error");
      }
    } finally {
      queryClient.invalidateQueries({ queryKey: [`${schemaType}Layer`, layerId] });
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    router.push(`/layers/${schemaType}`);
  };

  if (loading || isLoadingLayer) {
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
            Loading {schemaType} layer for editing...
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

  if (layerError) {
    return (
      <Container maxWidth="md">
        <Box mt={4}>
          <Alert severity="error" sx={{ mb: 2 }}>
            <Typography variant="h6" component="div" gutterBottom>
              Failed to Load Layer Data
            </Typography>
            {layerError.message}
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

  if (!layerData) {
    return (
      <Container maxWidth="md">
        <Box mt={4}>
          <Alert severity="warning">
            Layer data not found.
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
            initialValues={layerData}
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            loading={submitting}
            submitText={`Update ${menuItem?.name || 'Layer'}`}
            cancelText="Cancel"
          />
        </Paper>
      </Box>
    </Container>
  );
}