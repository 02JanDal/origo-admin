'use client';
import { Grid, Typography, TextField, FormControlLabel, Checkbox } from "@mui/material";
import MainCard from "@/components/Cards/MainCard/MainCard";
import styles from "@/app/page.module.css";
import { useRouter, usePathname } from "next/navigation";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { MapInstanceService as service } from '@/api';
import { mapDataToTableFormat } from "@/utils/mappers/toDataTable";
import mapSpec from "@/assets/specifications/tables/mapInstanceTableSpecification.json";
import DetailedDataTable from "@/components/Tables/DetailedDataTable";
import FormDialog from "@/components/Dialogs/FormDialog";
import PublishMapFormDialog from "@/components/Dialogs/PublishMapFormDialog";
import { useEffect, useState } from "react";
import { MapInstanceDto } from "@/shared/interfaces/dtos";
import AlertDialog from "@/components/Dialogs/AlertDialog";
import { useApp } from "@/contexts/AppContext";
import envStore from "@/stores/Environment";

export default function Page() {
    const queryKey = 'maps';
    const queryClient = useQueryClient();
    const { data = [], isLoading, error } = useQuery({ queryKey: [queryKey], queryFn: () => service.fetchList() });
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [toBeDeteledId, setToBeDeletedId] = useState<string | null>(null);
    const [toBePublishedId, setToBePublishedId] = useState<string | null>(null);
    const [isAlertDialogOpen, setAlertDialogOpen] = useState(false);
    const [isPublishDialogOpen, setPublishDialogOpen] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const { showToast } = useApp();
    const [origoUrl, setOrigoUrl] = useState('');

    const router = useRouter();
    const pathname = usePathname()

    useEffect(() => {
        const fetchBaseUrl = async () => {
            const origoUrl = await envStore("ORIGO_URL");
            setOrigoUrl(origoUrl);
        };
        fetchBaseUrl();
    }, []);

    const handleDialogOpen = () => {
        setErrorMessage(null);
        setIsDialogOpen(true);
    };
    const handleDialogClose = () => {
        setIsDialogOpen(false);
    };

    const handleAddClick = () => {
        handleDialogOpen();
    };

    const handleEdit = (id: string) => {
        const editUrl = `${pathname}/edit/${id}`;
        router.push(editUrl);
    };
    const onChange = () => {
        if (setErrorMessage) setErrorMessage(null);
    }

    
    // Handle the delete mapinstance dialog
    const handleDelete = async (id: string) => {
        setToBeDeletedId(id);
        setAlertDialogOpen(true);
    };
    const confirmDelete = async () => {
        try {
            let id = toBeDeteledId!;
            await service.delete(id);
            queryClient.invalidateQueries({ queryKey: [queryKey] });
            setAlertDialogOpen(false);
            showToast('Kartinstansen raderades', 'success');

        } catch (error) {
            showToast('Ett fel inträffade, kunde inte radera kartinstansen.', 'error');
            console.error(`[${new Date().toISOString()}] Error deleting WMS Layer: ${error}`);
        }
    };
    
    // Handle the preview mapinstance action
    const handlePreview = (id: string) => {
        window.open(`${origoUrl}/${id}/preview`, '_blank');
    };

    // Handle the publish mapinstance dialog
    const handlePublish = (id: string) => {
        setToBePublishedId(id);
        setPublishDialogOpen(true);
    };
    const confirmPublish = async () => {
        queryClient.invalidateQueries({ queryKey: [queryKey] });
    };

    const onSubmit = async (formData: FormData) => {
        const entries = Object.fromEntries(formData.entries());

        if (data?.length === 0 || !data?.some((d) => d.name.toLowerCase() === entries.name.toString().toLowerCase())) {
            const newMapInstance: MapInstanceDto = {
                name: entries.name.toString(),
                title: entries.name.toString(),
                isPublic: formData.get('isPublic') !== null,
                instance: {
                    controls: [],
                    groups: [],
                    layers: []
                }
            };

            await service.add(newMapInstance).then((dto) => {
                queryClient.invalidateQueries({ queryKey: [queryKey] });
                if (dto.id!) {
                    handleDialogClose();
                    const editUrl = `${pathname}/edit/${dto.id!}`;
                    router.push(editUrl);
                }
            }).catch((error) => {
                const message = error.message || "Ett okänt fel inträffade.";
                setErrorMessage(message);
            });
        }
        else {
            setErrorMessage("En kartinstans med samma namn finns redan.");
        }
    }

    if (isLoading) {
        return <div>Laddar...</div>;
    }

    if (error) {
        return <div>Ett fel inträffade: {error.message}</div>;
    }

    return (
        <main className={styles.main}>
            <Grid container rowSpacing={4.5} columnSpacing={2.75}>
                <Grid item xs={12} sx={{ mb: -2.25, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                        <Typography sx={{ pl: '10px' }} variant="h5">Kartinstanser</Typography>
                    </div>
                </Grid>
                <Grid item xs={12} md={12} lg={12}>
                    <MainCard>
                        <DetailedDataTable
                            data={mapDataToTableFormat(data, mapSpec.specification)}
                            isSearchable={true}
                            pagination={true}
                            rowsPerPage={10}
                            customEvents={[
                                { label: "Förhandsgranska", action: (id) => handlePreview(id) },
                                { label: "Publicera", action: (id) => handlePublish(id) }
                            ]}
                            onAdd={handleAddClick}
                            onEdit={handleEdit}
                            onDelete={handleDelete}
                        />
                    </MainCard>
                    <FormDialog open={isDialogOpen} onClose={handleDialogClose} title="Skapa ny kartinstans"
                        contentText="Skapa ny kartinstans genom att fylla i titel nedan och trycka Skapa."
                        onSubmit={onSubmit}
                        errorMessage={errorMessage}
                        fieldToValidate="name"
                        textField={<>
                            <TextField
                                autoFocus
                                onChange={onChange}
                                required
                                margin="dense"
                                id="name"
                                name="name"
                                label="Namn på kartinstans"
                                type="text"
                                fullWidth
                                variant="standard"
                            />
                            <FormControlLabel
                                control={<Checkbox id="isPublic" name="isPublic" />}
                                label="Publik kartinstans"
                            />
                        </>} />
                    <PublishMapFormDialog
                        open={isPublishDialogOpen} onClose={() => setPublishDialogOpen(false)} onConfirm={confirmPublish}
                        id={toBePublishedId}
                    />
                    <AlertDialog title="Bekräfta borttagning" contentText="Vänligen bekräfta borttagning av kartinstansen!"
                        open={isAlertDialogOpen} onClose={() => setAlertDialogOpen(false)} onConfirm={confirmDelete} />
                </Grid>
            </Grid>
        </main >
    )
}
