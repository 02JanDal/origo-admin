'use client';
import { GridLegacy as Grid, Typography, Button } from "@mui/material";
import MainCard from "@/components/Cards/MainCard/MainCard";
import styles from "@/app/page.module.css";
import { useRouter, usePathname } from "next/navigation";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { AccessTokenService as service } from '@/api';
import { mapDataToTableFormat } from "@/utils/mappers/toDataTable";
import spec from "@/assets/specifications/tables/accessTokenTableSpecification.json";
import DetailedDataTable from "@/components/Tables/DetailedDataTable";
import { useState } from "react";
import AlertDialog from "@/components/Dialogs/AlertDialog";
import { useApp } from "@/contexts/AppContext";

export default function Page() {
    const queryKey = "access-token";
    const headerText = "Hantera API-nycklar";
    const errorMessage = "Error Deleting Access Token:";
    const [isAlertDialogOpen, setAlertDialogOpen] = useState(false);
    const [toBeDeteledId, setToBeDeletedId] = useState<string | null>(null);
    const { data, isLoading, error } = useQuery({ queryKey: [queryKey], queryFn: () => service.fetchAll() });
    const router = useRouter();
    const pathname = usePathname()
    const { showToast } = useApp();

    const handleAddClick = () => {
        const addUrl = `${pathname}/add/`;
        router.push(addUrl);
    };

    const queryClient = useQueryClient();

    if (isLoading) {
        return <div>Laddar...</div>;
    }

    if (error) {
        return <div>Ett fel inträffade: {error.message}</div>;
    }

    const handleDelete = async (id: string) => {
        setToBeDeletedId(id);
        setAlertDialogOpen(true);
    };

    const confirmDelete = async () => {
        try {
            let id = toBeDeteledId!;
            await service.delete(id);
            queryClient.invalidateQueries({ queryKey: [queryKey] });
            showToast('API-Nyckeln har raderats', 'success');
            setAlertDialogOpen(false);
        } catch (error) {
            showToast('API-Nyckeln kunde inte raderas', 'error');
            console.error(`[${new Date().toISOString()}] ${errorMessage} ${error}`);
        }
    }
    return (
        <main className={styles.main}>
            <Grid container rowSpacing={4.5} columnSpacing={2.75}>
                <Grid item xs={12} sx={{ mb: -2.25, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                        <Typography sx={{ pl: '10px' }} variant="h5">{headerText}</Typography>
                    </div>
                </Grid>
                <Grid item xs={12} md={12} lg={12}>
                    <MainCard>
                        <DetailedDataTable
                            data={mapDataToTableFormat(data!, spec.specification)}
                            isSearchable={true}
                            pagination={true}
                            rowsPerPage={10}
                            expandable={true}
                            onAdd={handleAddClick} onDelete={handleDelete}></DetailedDataTable>
                    </MainCard>
                </Grid>
                <AlertDialog open={isAlertDialogOpen} onConfirm={confirmDelete} contentText="Vänligen bekräfta borttagning av API-nyckeln, observera att tjänster som använder api-nyckeln slutar fungera om denna tas bort!"
                    onClose={() => setAlertDialogOpen(false)} title="Bekräfta borttagning">
                </AlertDialog>
            </Grid>
        </main >
    )
}
