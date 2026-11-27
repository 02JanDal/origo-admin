'use client';
import React, { use } from 'react';
import LayerEditView from '@/views/layers/LayerEditView';
import { WMSLayerService } from '@/api';
import { DataRowToWMSLayerDto } from "@/utils/mappers";
import spec from "@/assets/specifications/tables/wmsTableSpecification.json";

export default function WMSEditPage(props: { params: Promise<{ id: string }> }) {
    const params = use(props.params);

    const {
        id
    } = params;

    return (
        <LayerEditView
            id={id}
            title="Uppdatera WMS"
            queryKey="wmslayers"
            service={WMSLayerService}
            mapper={DataRowToWMSLayerDto}
            specification={spec}
            layerType="wms"
        />
    );
}