'use client';

import React, { use } from 'react';
import GenericLayersListingView from '@/views/layers/GenericLayersListingView';

interface GenericSchemaListPageProps {
  params: Promise<{
    schema: string;
  }>;
}

export default function GenericSchemaListPage(props: GenericSchemaListPageProps) {
  const params = use(props.params);
  const schemaType = params.schema;

  return <GenericLayersListingView schemaType={schemaType} />;
}