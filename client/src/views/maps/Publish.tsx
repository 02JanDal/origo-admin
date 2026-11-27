import DetailedDataTable from "@/components/Tables/DetailedDataTable";
import { Box, GridLegacy as Grid, Button } from "@mui/material";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { MapInstanceService as service } from '@/api';
import { mapDataToTableFormat } from "@/utils/mappers/toDataTable";
import spec from "@/assets/specifications/tables/mapInstancePublishTableSpecification.json";
import AlertDialog from "@/components/Dialogs/AlertDialog";
import PublishMapFormDialog from "@/components/Dialogs/PublishMapFormDialog";
import { useEffect, useState } from "react";
import MainCard from "@/components/Cards/MainCard/MainCard";
import envStore from "@/stores/Environment";
import { Pageview } from "@mui/icons-material";
import { useApp } from "@/contexts/AppContext";

interface PublishProps {
    id: string;
}

const Publish = ({ id }: PublishProps) => {
    const queryClient = useQueryClient();
    const queryKey = "list";
    const { data } = useQuery({ queryKey: [queryKey], queryFn: () => service.fetchPublishedList(id) });
    const [isPublishDialogOpen, setPublishDialogOpen] = useState(false);
    const [isConfirmRepublishDialogOpen, setConfirmRepublishDialogOpen] = useState(false);
    const [selectedInstance, setSelectedInstance] = useState<any>();
    const [origoUrl, setOrigoUrl] = useState('');
    const { showToast } = useApp();

    useEffect(() => {
        const fetchBaseUrl = async () => {
            const origoUrl = await envStore("ORIGO_URL");
            setOrigoUrl(origoUrl);
        };
        fetchBaseUrl();
    }, []);

    // Handle the publish mapinstance dialog
    const handlePublish = () => {
        setPublishDialogOpen(true);
    };
    const confirmPublish = async () => {
        queryClient.invalidateQueries({ queryKey: [queryKey] });
    };

    // Handle the republish previously published map dialog
    const handleRepublish = async (id: string) => {
        const selectedInstance = data!.find((instance: any) => instance.id === id);
        setSelectedInstance(selectedInstance);
        setConfirmRepublishDialogOpen(true);
    };
    const handleRepublishDialogClose = () => {
        setConfirmRepublishDialogOpen(false);
        setSelectedInstance(undefined);
    };
    const confirmRepublish = async () => {
        try {
            await service.republish(id, selectedInstance!.id);
            queryClient.invalidateQueries({ queryKey: [queryKey] });
            handleRepublishDialogClose();
            showToast('Kartinstansen har publicerats!', 'success');

        } catch (error) {
            showToast('Ett fel inträffade, kunde inte ompublicera kartinstansen', 'error');
            console.error(`[${new Date().toISOString()}] ${error}`);
        }
    };

    // Handle the preview published map action
    const handlePreview = (instanceId: string) => {
        window.open(`${origoUrl}/${instanceId}/preview`, '_blank');
    };

    // Handle the preview mapinstance button
    const handleGlobalPreview = () => {
        window.open(`${origoUrl}/${id}/preview`, '_blank');
    };

    return (
        <Box component='div'>
            <Grid item xs={12} md={12} lg={12}>
                <MainCard>
                    {data && <>
                        <Box sx={{ position: 'relative', mb: 2 }}>
                            <>
                                <Button onClick={handleGlobalPreview}
                                    variant="contained"
                                    startIcon={<Pageview />}
                                    sx={{
                                        position: 'relative',
                                        top: 0,
                                        right: 0,
                                        zIndex: 1,
                                        color: 'white'
                                    }}
                                >Förhandsgranska
                                </Button>
                            </>
                        </Box>

                        <DetailedDataTable
                            data={mapDataToTableFormat(data!, spec.specification)}
                            onAdd={handlePublish}
                            pagination={true}
                            rowsPerPage={10}
                            customEvents={[
                                { label: "Ompublicera", action: (id) => handleRepublish(id) },
                                { label: "Förhandsgranska", action: (id) => handlePreview(id) },
                            ]}
                            customOnAddLabel="Publicera"
                        ></DetailedDataTable>
                    </>}
                </MainCard>
            </Grid>
            <PublishMapFormDialog
                open={isPublishDialogOpen} onClose={() => setPublishDialogOpen(false)} onConfirm={confirmPublish}
                id={id}
            />
            <AlertDialog title="Ompublicera kartinstans" contentText={`Är du säker på att du vill ompublicera kartinstansen "${selectedInstance?.title}"?`}
                open={isConfirmRepublishDialogOpen} onClose={() => setConfirmRepublishDialogOpen(false)} onConfirm={confirmRepublish} />
        </Box>
    );
};

export default Publish;