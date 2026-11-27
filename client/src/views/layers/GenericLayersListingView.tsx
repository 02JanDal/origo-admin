'use client';
import { GridLegacy as Grid, Typography } from "@mui/material";
import MainCard from "@/components/Cards/MainCard/MainCard";
import styles from "@/app/page.module.css";
import { useRouter, usePathname } from "next/navigation";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import DetailedDataTable from "@/components/Tables/DetailedDataTable";
import { mapDataToTableFormat } from "@/utils/mappers/toDataTable";
import { MapInstanceService as mapInstanceService } from "@/api";
import { useEffect, useState } from "react";
import LinkResourceDialog from "@/components/Dialogs/LinkResourceDialog";
import { LinkResourceDto } from "@/shared/interfaces/dtos";
import AlertDialog from "@/components/Dialogs/AlertDialog";
import React from "react";
import { useApp } from "@/contexts/AppContext";
import { createGenericLayerService } from "@/api/genericLayerService";
import { generateTableSpecification, TableSpecification } from "@/utils/schema/generateTableSpecification";
import { getJSONSchema } from "@/utils/schema/schemaRegistry";
import { ExtendedJSONSchema } from "@/shared/interfaces";

interface GenericLayersListingViewProps {
    schemaType: string;
}

export default function GenericLayersListingView({ schemaType }: GenericLayersListingViewProps) {
    const [service] = useState(() => createGenericLayerService(schemaType));
    const [tableSpec, setTableSpec] = useState<TableSpecification | null>(null);
    const [menuItem, setMenuItem] = useState<any>(null);
    const [loadingSchema, setLoadingSchema] = useState(true);

    const queryKey = `${schemaType.toLowerCase()}layers`;
    const { data, isLoading, error } = useQuery({
        queryKey: [queryKey],
        queryFn: () => service.fetchAll(),
        enabled: !!tableSpec
    });

    const [isDialogOpen, setDialogOpen] = useState(false);
    const [isAlertDialogOpen, setAlertDialogOpen] = useState(false);
    const [isConfirmDuplicateDialogOpen, setConfirmDuplicateDialogOpen] = useState(false);
    const [selectedLayer, setSelectedLayer] = useState<any>();
    const [key, setKey] = useState(0);
    const queryClient = useQueryClient();
    const { showToast } = useApp();

    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        const loadSchemaAndTableSpec = async () => {
            try {
                setLoadingSchema(true);

                const schema: ExtendedJSONSchema = await getJSONSchema(schemaType);

                const displayName = schema.title || schemaType.toUpperCase();
                setMenuItem({ name: displayName } as any);

                const generatedSpec = generateTableSpecification(schema);
                setTableSpec(generatedSpec);

            } catch (err) {
                console.error(`❌ Failed to load schema for ${schemaType}:`, err);
                showToast(`Failed to load ${schemaType} configuration`, 'error');
            } finally {
                setLoadingSchema(false);
            }
        };

        loadSchemaAndTableSpec();
    }, [schemaType, showToast]);

    const handleAddClick = () => {
        const addUrl = `${pathname}/add/`;
        router.push(addUrl);
    };

    const handleEdit = (id: string) => {
        const editUrl = `${pathname}/edit/${id}`;
        router.push(editUrl);
    };

    const handleDuplicate = async (id: string) => {
        const selectedLayer = data!.find((layer: any) => layer.id === id);
        setSelectedLayer(selectedLayer);
        setConfirmDuplicateDialogOpen(true);
    };

    const confirmDuplicate = async () => {
        try {
            await service.duplicate(selectedLayer!.id);
            queryClient.invalidateQueries({ queryKey: [queryKey] });
            handleDuplicateDialogClose();
            showToast('Lagret duplicerades', 'success');
        } catch (error) {
            showToast('Ett fel inträffade, lagret kunde inte dupliceras.', 'error');
            console.error(`[${new Date().toISOString()}] Error duplicating layer: ${error}`);
        }
    }

    const handleDuplicateDialogClose = () => {
        setConfirmDuplicateDialogOpen(false);
        setSelectedLayer(undefined);
    }

    const handleChangeSource = (id: string) => {
        const selectedLayer = data!.find((layer: any) => layer.id === id);
        setSelectedLayer(selectedLayer);
        setDialogOpen(true);
    }

    const handleDialogClose = () => {
        setSelectedLayer(undefined);
        setDialogOpen(false);
        setKey(key + 1);
    };

    const onSubmit = async (linkResource: LinkResourceDto, mapInstanceIds: string[]) => {
        try {
            selectedLayer!.source = linkResource;
            await service.update(selectedLayer!.id, selectedLayer!);
            if (mapInstanceIds.length > 0) {
                const request = { mapInstances: mapInstanceIds, actions: ['source'] };
                mapInstanceService.syncLayer(request, selectedLayer!.type, selectedLayer!.id);
                handleDialogClose();
            }
            queryClient.invalidateQueries({ queryKey: [queryKey] });
            showToast('Källan har uppdaterats', 'success');
        } catch (error) {
            showToast('Ett fel inträffade, källan kunde inte uppdateras.', 'error');
            console.error(`[${new Date().toISOString()}] Error updating source: ${error}`);
        }
    }

    const handleDelete = async (id: string) => {
        const selectedLayer = data!.find((layer: any) => layer.id === id);
        setSelectedLayer(selectedLayer);
        setAlertDialogOpen(true);
    };

    const confirmDelete = async () => {
        try {
            let id = selectedLayer.id;
            await service.delete(id);
            queryClient.invalidateQueries({ queryKey: [queryKey] });
            setAlertDialogOpen(false);
            showToast('Lagret har raderats', 'success');
        } catch (error) {
            showToast('Ett fel inträffade när lagret skulle raderas.', 'error');
            console.error(`[${new Date().toISOString()}] Error deleting ${schemaType} Layer: ${error}`);
        }
    };

    if (loadingSchema || !tableSpec) {
        return (
            <main className={styles.main}>
                <Grid container spacing={2}>
                    <Grid item xs={12}>
                        <Typography variant="h3">{menuItem?.name || schemaType}</Typography>
                    </Grid>
                    <Grid item xs={12}>
                        <MainCard>
                            <div>Laddar schema och tabellkonfiguration...</div>
                        </MainCard>
                    </Grid>
                </Grid>
            </main>
        );
    }

    if (isLoading) {
        return (
            <main className={styles.main}>
                <Grid container spacing={2}>
                    <Grid item xs={12}>
                        <Typography variant="h3">{menuItem?.name || schemaType}</Typography>
                    </Grid>
                    <Grid item xs={12}>
                        <MainCard>
                            <div>Laddar...</div>
                        </MainCard>
                    </Grid>
                </Grid>
            </main>
        );
    }

    if (error) {
        return (
            <main className={styles.main}>
                <Grid container spacing={2}>
                    <Grid item xs={12}>
                        <Typography variant="h3">{menuItem?.name || schemaType}</Typography>
                    </Grid>
                    <Grid item xs={12}>
                        <MainCard>
                            <div>Ett fel inträffade: {error.message}</div>
                        </MainCard>
                    </Grid>
                </Grid>
            </main>
        );
    }

    return (
        <main className={styles.main}>
            <Grid container spacing={2}>
                <Grid item xs={12}>
                    <Typography variant="h3">{menuItem?.name || schemaType}</Typography>
                </Grid>
                <Grid item xs={12}>
                    <MainCard>
                        <Grid container rowSpacing={4.5}>
                            <Grid item xs={12} md={12} lg={12}>
                                <DetailedDataTable
                                    data={mapDataToTableFormat(data!, tableSpec.specification)}
                                    isSearchable={true}
                                    expandable={true}
                                    pagination={true}
                                    rowsPerPage={10}
                                    sortingEnabled={true}
                                    customEvents={[
                                        { label: "Byt källa", action: (id) => handleChangeSource(id) },
                                        { label: "Duplicera", action: (id) => handleDuplicate(id) },
                                    ]}
                                    onAdd={handleAddClick}
                                    onEdit={handleEdit}
                                    onDelete={handleDelete}
                                />
                            </Grid>
                        </Grid >
                    </MainCard>
                </Grid>
            </Grid >

            {selectedLayer && isDialogOpen && selectedLayer.source && (
                <LinkResourceDialog
                    key={key}
                    linkResourceType={schemaType.toUpperCase()}
                    layerId={selectedLayer.id}
                    linkResource={selectedLayer.source}
                    open={isDialogOpen}
                    onClose={handleDialogClose}
                    onSubmit={onSubmit}
                />
            )}

            <AlertDialog
                open={isConfirmDuplicateDialogOpen}
                onClose={() => setConfirmDuplicateDialogOpen(false)}
                title="Duplicera lager"
                contentText={`Är du säker på att du vill duplicera lagret "${selectedLayer?.title}"?`}
                onConfirm={confirmDuplicate}
            />

            {selectedLayer && (
                <AlertDialog
                    open={isAlertDialogOpen}
                    onConfirm={confirmDelete}
                    contentText={`Vänligen bekräfta borttagning av lagret ${selectedLayer.title}!`}
                    onClose={() => setAlertDialogOpen(false)}
                    title="Bekräfta borttagning"
                />
            )}
        </main >
    )
}