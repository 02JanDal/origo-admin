'use client';
import { GridLegacy as Grid, Typography, Stack, TextField, InputLabel, Button, FormControl, FormControlLabel, Radio, RadioGroup, Box } from "@mui/material";
import MainCard from "@/components/Cards/MainCard/MainCard";
import styles from "@/app/page.module.css";
import { useRouter } from "next/navigation";
import { PermissionService as service } from '@/api';
import React, { useEffect, useState, use } from 'react';
import { useQueryClient, useQuery } from "@tanstack/react-query";
import GenericTable from "@/components/Tables/GenericTable";
import FormDialog from "@/components/Dialogs/FormDialog";
import { ActorDto, PermissionDto, RoleDto } from "@/shared/interfaces/dtos";
import { TabContainer } from "@/components/Tabs/TabContainer";
import DetailedDataTable from "@/components/Tables/DetailedDataTable";
import { useMemo } from 'react';


// Layers
import layerSpec from "@/assets/specifications/tables/layerTableSpecification.json";
import { LayerService as layerService } from '@/api';
import { mapDataToTableFormat } from "@/utils/mappers/toDataTable";
import { DataRow, TableData } from "@/interfaces";

//Sources
import sourcesSpec from "@/assets/specifications/tables/linkResourceTableSpecification.json";
import { LinkResourceService as sourcesService } from '@/api';

//Controls
import controlsSpec from "@/assets/specifications/tables/mapControlTableSpecification.json";
import { MapControlService as controlsService } from '@/api';

//Map instances
import mapInstanceSpec from "@/assets/specifications/tables/mapInstanceTableSpecification.json";
import { MapInstanceService as mapInstanceService } from '@/api';
import { useApp } from "@/contexts/AppContext";

export default function Page(props: { params: Promise<{ id: string }> }) {
    const params = use(props.params);

    const {
        id
    } = params;

    const key = "permissions";
    const { data, } = useQuery({ queryKey: [key, id], queryFn: () => service.fetch(id) });
    const { showToast, showToastAfterNavigation } = useApp();

    const [actorData, setActorData] = useState<Array<Record<string, any>>>();

    const [isAddActorDialogOpen, setIsAddActorDialogOpen] = useState(false);
    const [errorAddActorMessage, setErrorAddActorMessage] = useState<string | null>(null);
    const queryClient = useQueryClient();
    const headers = ["name", "type"];

    //Layers
    const layerKey = "layers";
    const { data: layerData } = useQuery({ queryKey: [layerKey], queryFn: () => layerService.fetchAll() });
    const [selectedLayerRows, setSelectedLayerRows] = useState<DataRow[]>([]);
    const [layerTableData, setLayerTableData] = useState<TableData>();

    //Sources
    const sourcesKey = "sources";
    const { data: sourcesData } = useQuery({ queryKey: [sourcesKey], queryFn: () => sourcesService.fetchAll() });
    const [selectedSourcesRows, setSelectedSourcesRows] = useState<DataRow[]>([]);
    const [sourcesTableData, setSourcesTableData] = useState<TableData>();

    //Controls
    const controlsKey = "controls";
    const { data: controlsData } = useQuery({ queryKey: [controlsKey], queryFn: () => controlsService.fetchAll() });
    const [selectedControlsRows, setSelectedControlsRows] = useState<DataRow[]>([]);
    const [controlsTableData, setControlsTableData] = useState<TableData>();

    //Map instances
    const mapInstanceKey = "mapInstances";
    const { data: mapInstanceData } = useQuery({ queryKey: [mapInstanceKey], queryFn: () => mapInstanceService.fetchAll() });
    const [selectedMapInstanceRows, setSelectedMapInstanceRows] = useState<DataRow[]>([]);
    const [mapInstanceTableData, setMapInstanceTableData] = useState<TableData>();


    const router = useRouter();
    const handleCancelClick = () => {
        router.back();
    };

    const items: Item[] = [
        { id: 0, label: 'Källor' },
        { id: 1, label: 'Lager' },
        { id: 2, label: 'Kontroller' }
    ];
    interface Item {
        id: number;
        label: string;
    }

    useEffect(() => {
        if (data) {
            setActorData(data.actors || []);
            const selectedLayerPermissions = data.permissions?.filter((perm: PermissionDto) => perm.type === 'layers') || [];
            const selectedRows = selectedLayerPermissions.map((perm: PermissionDto) => ({ id: perm.id! }));
            setSelectedLayerRows(selectedRows);

            const selectedSourcesPermissions = data.permissions?.filter((perm: PermissionDto) => perm.type === 'linkresources') || [];
            const selectedSourcesRows = selectedSourcesPermissions.map((perm: PermissionDto) => ({ id: perm.id! }));
            setSelectedSourcesRows(selectedSourcesRows);

            const selectedControlsPermissions = data.permissions?.filter((perm: PermissionDto) => perm.type === 'controls') || [];
            const selectedControlsRows = selectedControlsPermissions.map((perm: PermissionDto) => ({ id: perm.id! }));
            setSelectedControlsRows(selectedControlsRows);

            const selectedMapInstancePermissions = data.permissions?.filter((perm: PermissionDto) => perm.type === 'mapinstances') || [];
            const selectedMapInstanceRows = selectedMapInstancePermissions.map((perm: PermissionDto) => ({ id: perm.id! }));
            setSelectedMapInstanceRows(selectedMapInstanceRows);
        }
    }, [data]);


    useEffect(() => {
        if (layerData && sourcesData) {
            const selectedSourceIds = selectedSourcesRows.map(row => row.id);
            const filteredLayers = layerData.filter(layer =>
                selectedSourceIds.includes(layer.source.id!)
            );
            setLayerTableData(mapDataToTableFormat(filteredLayers, layerSpec.specification));
        }
    }, [layerData, sourcesData, selectedSourcesRows]);

    useEffect(() => {
        if (sourcesData) {
            setSourcesTableData(mapDataToTableFormat(sourcesData!, sourcesSpec.specification));
        }
    }, [sourcesData])

    useEffect(() => {
        if (controlsData) {
            setControlsTableData(mapDataToTableFormat(controlsData!, controlsSpec.specification));
        }
    }, [controlsData])

    useEffect(() => {
        if (mapInstanceData) {
            setMapInstanceTableData(mapDataToTableFormat(mapInstanceData!, mapInstanceSpec.specification));
        }
    }, [mapInstanceData])

    const availableLayerRows = useMemo(() => {
        if (!layerTableData) return [];
        const selectedSourceIds = selectedSourcesRows.map(row => row.id);
        return layerTableData.rows.filter(row => {
            const layer = layerData?.find(l => l.id === row.id);
            return layer && selectedSourceIds.includes(layer.source.id!);
        });
    }, [layerTableData, layerData, selectedSourcesRows]);

    const handleUpdateClick = async () => {
        try {
            const updatedLayerPermissions: PermissionDto[] = selectedLayerRows.map(row => ({
                id: row.id,
                type: 'layers'
            }));

            const updatedSourcesPermissions: PermissionDto[] = selectedSourcesRows.map(row => ({
                id: row.id,
                type: 'linkresources'
            }));

            const updatedControlsPermissions: PermissionDto[] = selectedControlsRows.map(row => ({
                id: row.id,
                type: 'controls'
            }));

            const updatedMapInstancePermissions: PermissionDto[] = selectedMapInstanceRows.map(row => ({
                id: row.id,
                type: 'mapinstances'
            }));

            const updatedPermissions = [...updatedLayerPermissions, ...updatedSourcesPermissions, ...updatedControlsPermissions, ...updatedMapInstancePermissions];

            const updatedData: RoleDto = {
                id: data?.id,
                role: data?.role ?? '',
                actors: actorData as ActorDto[],
                permissions: updatedPermissions
            };

            await service.update(id, updatedData);
            queryClient.invalidateQueries({ queryKey: [key] });
            showToastAfterNavigation('Rollen har uppdaterats', 'success');

            router.back();
        } catch (error) {
            showToast('Kunde inte uppdatera rollen.', 'error');
            console.error(`[${new Date().toISOString()}] ${error}`);
        }
    };

    const onLayerRowSelectionChanged = (ids: string[]) => {
        setSelectedLayerRows((prevRows) => {
            const newSelectedIds = new Set(ids);
            const remainingRows = prevRows.filter(row => newSelectedIds.has(row.id));
            const newRows = ids
                .filter(id => !prevRows.some(row => row.id === id))
                .map(id => layerTableData?.rows.find(row => row.id.toString() === id))
                .filter((row): row is DataRow => row !== undefined);

            return [...remainingRows, ...newRows];
        });
    };

    const onSourcesRowSelectionChanged = (ids: string[]) => {
        setSelectedSourcesRows((prevRows) => {
            const newSelectedIds = new Set(ids);
            const remainingRows = prevRows.filter(row => newSelectedIds.has(row.id));
            const newRows = ids
                .filter(id => !prevRows.some(row => row.id === id))
                .map(id => sourcesTableData?.rows.find(row => row.id.toString() === id))
                .filter((row): row is DataRow => row !== undefined);

            const updatedRows = [...remainingRows, ...newRows];

            // Filter selected layer rows based on new source selection
            setSelectedLayerRows(prevLayerRows =>
                prevLayerRows.filter(row => {
                    const layer = layerData?.find(l => l.id === row.id);
                    return layer && updatedRows.some(sourceRow => sourceRow.id === layer.source.id);
                })
            );

            return updatedRows;
        });
    };

    const onControlsRowSelectionChanged = (ids: string[]) => {
        setSelectedControlsRows((prevRows) => {
            const newSelectedIds = new Set(ids);
            const remainingRows = prevRows.filter(row => newSelectedIds.has(row.id));
            const newRows = ids
                .filter(id => !prevRows.some(row => row.id === id))
                .map(id => controlsTableData?.rows.find(row => row.id.toString() === id))
                .filter((row): row is DataRow => row !== undefined);
            return [...remainingRows, ...newRows];
        });
    }

    const onMapInstanceRowSelectionChanged = (ids: string[]) => {
        setSelectedMapInstanceRows((prevRows) => {
            const newSelectedIds = new Set(ids);
            const remainingRows = prevRows.filter(row => newSelectedIds.has(row.id));
            const newRows = ids
                .filter(id => !prevRows.some(row => row.id === id))
                .map(id => mapInstanceTableData?.rows.find(row => row.id.toString() === id))
                .filter((row): row is DataRow => row !== undefined);
            return [...remainingRows, ...newRows];
        });
    }


    const handleRowDelete = (updatedData: Array<Record<string, any>>) => {
        setActorData(updatedData);
    };

    const handleAddActor = (formData: FormData) => {
        const entries = Object.fromEntries(formData.entries());
        const newActor: ActorDto = {
            name: entries.name.toString(),
            type: entries.actorType.toString(),
        };
        if (actorData!.length === 0 || !actorData!.some((d) => d.name.toLowerCase() === newActor.name.toLowerCase())) {
            const updatedData = [...actorData!, newActor];
            setActorData(updatedData);
            setIsAddActorDialogOpen(false);
        } else {
            setErrorAddActorMessage("En grupp eller användare med samma namn finns redan.");
        }
    };

    return (
        <main className={styles.main}>
            <Grid container rowSpacing={4.5} columnSpacing={2.75}>
                <Grid item xs={12} sx={{ mb: -2.25 }}>
                    <Typography sx={{ pl: '10px' }} variant="h5"></Typography>
                </Grid>
                <Grid item xs={12}>
                    <h2>Editera Roll</h2>
                    <MainCard>
                        <Grid container spacing={1}>
                            <Grid item xs={12} >
                                <Box component='div' sx={{ display: 'flex', alignItems: 'center' }}>
                                    <h3>Roll:</h3>
                                    <h3>{data?.role}</h3>
                                </Box>
                            </Grid>
                            <Grid item xs={12} container justifyContent="space-between" alignItems="center">
                                <Grid item>
                                    <InputLabel>Grupper & Användare</InputLabel>
                                </Grid>
                                <Grid item>
                                    <Button variant="contained" color="primary" onClick={() => { setIsAddActorDialogOpen(true) }}>
                                        Lägg till
                                    </Button>
                                </Grid>
                            </Grid>
                            <Grid item xs={12} >
                                {actorData && <GenericTable headers={headers} data={actorData} onRowDelete={handleRowDelete} />}
                            </Grid>
                            <Box component='div' sx={{ width: '100%', borderBottom: '1px solid #ccc', my: 4 }} />
                            <Grid item xs={12}>
                                <TabContainer items={items}>
                                    {data && sourcesTableData && selectedSourcesRows && <DetailedDataTable
                                        data={sourcesTableData}
                                        isSearchable={true}
                                        expandable={false}
                                        pagination={true}
                                        rowsPerPage={10}
                                        selectedRows={selectedSourcesRows}
                                        sortingEnabled={true}
                                        onSelectionChanged={onSourcesRowSelectionChanged}
                                    />}
                                    {data && layerTableData && selectedLayerRows && <DetailedDataTable
                                        data={{
                                            ...layerTableData,
                                            rows: availableLayerRows  // Use the filtered rows
                                        }}
                                        isSearchable={true}
                                        expandable={false}
                                        pagination={true}
                                        rowsPerPage={10}
                                        selectedRows={selectedLayerRows}
                                        sortingEnabled={true}
                                        onSelectionChanged={onLayerRowSelectionChanged}
                                    />}
                                    {data && controlsTableData && selectedControlsRows && <DetailedDataTable
                                        data={controlsTableData}
                                        isSearchable={true}
                                        expandable={false}
                                        pagination={true}
                                        rowsPerPage={10}
                                        selectedRows={selectedControlsRows}
                                        sortingEnabled={true}
                                        onSelectionChanged={onControlsRowSelectionChanged}
                                    />}
                                </TabContainer>
                            </Grid>
                        </Grid>
                        <Grid item xs={12}>
                            <Stack direction="row" justifyContent="flex-end" sx={{ mt: 2 }}>
                                <Button variant="contained" type="submit" sx={{ mr: 1, backgroundColor: "red" }} onClick={() => handleCancelClick()} >
                                    Avbryt
                                </Button>
                                <Button variant="contained" type="submit" disabled={!data?.role} onClick={() => handleUpdateClick()}>
                                    Uppdatera
                                </Button>
                            </Stack>
                        </Grid>
                    </MainCard>
                </Grid>
            </Grid >
            {AddActorFormDialog(isAddActorDialogOpen, setIsAddActorDialogOpen, handleAddActor, errorAddActorMessage, setErrorAddActorMessage)}
        </main >
    );
}



function AddActorFormDialog(isAddActorDialogOpen: boolean, setIsAddActorDialogOpen: React.Dispatch<React.SetStateAction<boolean>>, handleAddActor: (formData: FormData) => void, errorAddActorMessage: string | null, setErrorAddActorMessage: React.Dispatch<React.SetStateAction<string | null>>) {
    return <FormDialog open={isAddActorDialogOpen} onClose={() => setIsAddActorDialogOpen(false)} title="Lägg till Grupp eller Användare"
        contentText=""
        onSubmit={handleAddActor}
        errorMessage={errorAddActorMessage}
        fieldToValidate="name"
        textField={<>
            <TextField
                autoFocus
                onChange={() => { if (errorAddActorMessage) setErrorAddActorMessage(null); }}
                required
                margin="dense"
                id="name"
                name="name"
                label="Namn på Grupp eller Användare"
                type="text"
                fullWidth
                variant="standard" />
            <FormControl component="fieldset" sx={{ mt: 2 }}>
                <RadioGroup row aria-label="actorType" name="actorType" defaultValue="Group">
                    <FormControlLabel value="Group" control={<Radio />} label="Grupp" />
                    <FormControlLabel value="User" control={<Radio />} label="Användare" />
                </RadioGroup>
            </FormControl>
        </>} />;
}
