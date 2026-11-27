'use client';
import React, { use } from 'react';
import LayerEditView from '@/views/layers/LayerEditView';
import { WFSLayerService } from '@/api';
import { DataRowToWFSLayerDto } from "@/utils/mappers";
import spec from "@/assets/specifications/tables/wfsTableSpecification.json";

export default function WFSEditPage(props: { params: Promise<{ id: string }> }) {
    const params = use(props.params);

    const {
        id
    } = params;

    return (
        <LayerEditView
            id={id}
            title="Uppdatera WFS"
            queryKey="wfsLayer"
            service={WFSLayerService}
            mapper={DataRowToWFSLayerDto}
            specification={spec}
            layerType="wfs"
        />
    );
}