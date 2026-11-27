'use client';
import React, { use } from 'react';
import LayerEditView from '@/views/layers/LayerEditView';
import { WMTSLayerService } from '@/api';
import { DataRowToWMTSLayerDto } from "@/utils/mappers";
import spec from "@/assets/specifications/tables/wmtsTableSpecification.json";

export default function WMTSEditPage(props: { params: Promise<{ id: string }> }) {
    const params = use(props.params);

    const {
        id
    } = params;

    return (
        <LayerEditView
            id={id}
            title="Uppdatera WMTS"
            queryKey="wmtsLayer"
            service={WMTSLayerService}
            mapper={DataRowToWMTSLayerDto}
            specification={spec}
            layerType="wmts"
        />
    );
}