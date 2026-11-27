'use client';
import React, { useEffect, useState } from 'react';
import { GridLegacy as Grid, Typography } from "@mui/material";
import MainCard from "@/components/Cards/MainCard/MainCard";
import styles from "@/app/page.module.css";
import { useRouter } from "next/navigation";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { RelationService as relationService } from '@/api';
import { DynamicForm } from "@/components/Forms/DynamicForm";
import { DataRow } from "@/interfaces";
import { mapRowToTableFormat } from "@/utils/mappers/toDataTable";
import SyncLayerDialogDialog from "@/components/Dialogs/SyncLayerDialog";
import { MapInstanceService as mapInstanceService } from "@/api";
import { KeyValuePair } from '@/shared/interfaces/dtos';
import { useApp } from '@/contexts/AppContext';

interface LayerEditViewProps {
    id: string;
    title: string;
    queryKey: string;
    service: {
        fetch: (id: string) => Promise<any>;
        update: (id: string, data: any) => Promise<any>;
    };
    mapper: (rows: DataRow[], source: any) => any;
    specification: any;
    layerType: 'wms' | 'wfs' | 'wmts';
}

export default function LayerEditView({
    id,
    title,
    queryKey,
    service,
    mapper,
    specification,
    layerType
}: LayerEditViewProps) {
    const [row, setRow] = useState<DataRow>();
    const [dtoData, setDtoData] = useState<any>();
    const [open, setOpen] = useState(false);
    const queryClient = useQueryClient();
    const router = useRouter();
    const { showToast, showToastAfterNavigation } = useApp();

    const { data: relationData } = useQuery({
        queryKey: ['relations'],
        queryFn: () => relationService.fetchRelations(id, 'MapInstance', 'instance.layers.id')
    });

    const { data } = useQuery({
        queryKey: [queryKey, id],
        queryFn: () => service.fetch(id)
    });

    useEffect(() => {
        if (data) {
            setRow(mapRowToTableFormat(data, specification.specification));
            setDtoData(data);
        }
    }, [data, specification]);

    const handleCancelClick = () => {
        queryClient.invalidateQueries({ queryKey: ['relations'] });
        router.back();
    };

    const handleEditChange = (value: string | KeyValuePair[], index: number, field: keyof DataRow) => {
        if (row) {
            const updatedRow = { ...row, [field]: value };
            setRow(updatedRow);
        }
    };

    const handleClose = () => {
        queryClient.invalidateQueries({ queryKey: ['relations'] });
        setOpen(false);
    };

    const saveAndSync = async () => {
        if (relationData && relationData.length > 0) {
            setOpen(true);
        } else {
            handleSubmit();
        }
    };

    const handleConfirmDialog = async (mapInstanceIds: string[], actions: string[]) => {
        setOpen(false);
        await handleSubmit();
        if (mapInstanceIds.length > 0) {
            syncLayer(mapInstanceIds, row!.id, actions);
        }
    };

    const handleSubmit = async () => {
        try {
            const updatedLayer = mapper([row!], dtoData.source)[0];
            await service.update(row!.id, updatedLayer);
            queryClient.invalidateQueries({ queryKey: [queryKey] });
            queryClient.invalidateQueries({ queryKey: ['relations'] });
            router.back();
            showToastAfterNavigation('Ändringarna har sparats', 'success');
        } catch (error) {
            console.error(`[${new Date().toISOString()}] Error updating link resource: ${error}`);
            showToast('Ett fel inträffade. Ändringarna kunde inte sparas', 'error');
        }
    };

    const syncLayer = async (mapInstancesIds: string[], layerId: string, actions: string[]) => {
        const request = { mapInstances: mapInstancesIds, actions: actions };
        await mapInstanceService.syncLayer(request, layerType, layerId);
    };

    return (
        <main className={styles.main}>
            <Grid container rowSpacing={4.5} columnSpacing={2.75}>
                <Grid item xs={12} sx={{ mb: -2.25 }}>
                    <Typography sx={{ pl: '10px' }} variant="h5">{title}</Typography>
                </Grid>
                <Grid item xs={12}>
                    <MainCard>
                        {row && (
                            <DynamicForm
                                row={row}
                                handleEditChange={handleEditChange}
                                handleSave={saveAndSync}
                                handleCancel={handleCancelClick}
                                index={0}
                                columns={specification.specification.columns}
                            />
                        )}
                    </MainCard>
                </Grid>
            </Grid>
            {relationData && (
                <SyncLayerDialogDialog
                    title={'Uppdatera kartinstanser?'}
                    relations={relationData}
                    open={open}
                    onClose={handleClose}
                    onSubmit={handleConfirmDialog}
                />
            )}
        </main>
    );
}