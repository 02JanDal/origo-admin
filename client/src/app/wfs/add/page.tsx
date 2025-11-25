'use client'
import React from "react";
import LayerWizard from "@/views/wizard/LayerWizard";
import { WFSLayerService } from "@/api";
import { loadWFSCapabilities } from '@/hooks/capabilities';
import { useWFSDescribeFeatureTypes } from '@/hooks/describeFeatureTypes';
import { DataRowToWFSLayerDto } from "@/utils/mappers";
import tableSpec from "@/assets/specifications/tables/wfsTableSpecification.json";
import { mapDataToTableFormat } from "@/utils/mappers/toDataTable";
import { TableData } from "@/interfaces";
import { LinkResourceDto } from "@/shared/interfaces/dtos";

const customOnSearchClick = async (
    selectedSourceId: string,
    sources: LinkResourceDto[],
    loadCapabilities: (url: string) => Promise<any>,
    tableSpec: any,
    mapDataToTableFormat: (data: any[], spec: any) => TableData
) => {
    const describeHook = useWFSDescribeFeatureTypes();

    if (selectedSourceId) {
        const selectedSource = sources?.find(source => source.id === selectedSourceId);
        const response = await loadCapabilities(selectedSource!.url);
        let mappedData = mapDataToTableFormat(response.Layers, tableSpec.specification);

        try {
            const describeResponse = await describeHook.loadCapabilities(selectedSource!.url);
            mappedData = updateRowsWithDescribeResponse(mappedData, describeResponse);
        } catch (error) {
            console.error(`[${new Date().toISOString()}] Error fetching DescribeFeatureTypes: ${error}`);
        }

        return mappedData;
    }
    return {} as TableData;
};

const updateRowsWithDescribeResponse = (
    mappedData: TableData,
    describeResponse: Record<string, [string, string][]>
): TableData => {
    const updatedRows = mappedData.rows.map((row) => {
        const nameKey = row['name'];
        if (nameKey && describeResponse[nameKey]) {
            const attributes = describeResponse[nameKey].map(([_key, value]) => {
                return { name: value };
            });
            row.attributes = JSON.stringify(attributes);
        }
        return row;
    });
    return {
        ...mappedData,
        rows: updatedRows,
    };
};

export default function WFSPage() {
    return (
        <LayerWizard
            title="Lägg till WFS"
            serviceType="WFS"
            tableSpec={tableSpec}
            loadCapabilities={loadWFSCapabilities}
            mapDataToTableFormat={mapDataToTableFormat}
            mapperFunction={DataRowToWFSLayerDto}
            layerService={WFSLayerService}
            customOnSearchClick={customOnSearchClick}
            updateRowsWithDescribeResponse={updateRowsWithDescribeResponse}
        />
    );
}