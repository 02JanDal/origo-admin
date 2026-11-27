'use client';
import React, { use } from 'react';
import GenericJsonForm from '@/views/generic/GenericJsonFormView';
import { MapControlService } from '@/api';
import { MapControlDto } from "@/shared/interfaces/dtos";

export default function MapControlEditPage(props: { params: Promise<{ id: string }> }) {
    const params = use(props.params);

    const {
        id
    } = params;

    const initialContent = { Example: 'Example' };

    const dtoMapper = (title: string, jsonContent: object, id?: string): MapControlDto => ({
        id,
        title,
        control: jsonContent
    });

    return (
        <GenericJsonForm
            id={id}
            title="Uppdatera verktyg"
            service={MapControlService}
            queryKey="mapControls"
            initialJsonContent={initialContent}
            dtoMapper={dtoMapper}
        />
    );
}