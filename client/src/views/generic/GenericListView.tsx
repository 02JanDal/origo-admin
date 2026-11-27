'use client';
import React, { useState } from 'react';
import { GridLegacy as Grid, Typography } from "@mui/material";
import MainCard from "@/components/Cards/MainCard/MainCard";
import styles from "@/app/page.module.css";
import { useRouter, usePathname } from "next/navigation";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import DetailedDataTable from "@/components/Tables/DetailedDataTable";
import { mapDataToTableFormat } from "@/utils/mappers/toDataTable";
import AlertDialog from "@/components/Dialogs/AlertDialog";
import { useApp } from '@/contexts/AppContext';

interface GenericListViewProps {
    queryKey: string;
    headerText: string;
    errorMessage: string;
    service: {
        fetchAll: () => Promise<any>;
        delete: (id: string) => Promise<any>;
    };
    specification: any;
    expandable?: boolean;
    alertDialogContent: string;
}

export default function GenericListView({
    queryKey,
    headerText,
    errorMessage,
    service,
    specification,
    expandable = false,
    alertDialogContent
}: GenericListViewProps) {
    const [isAlertDialogOpen, setAlertDialogOpen] = useState(false);
    const [toBeDeletedId, setToBeDeletedId] = useState<string | null>(null);
    const { data, isLoading, error } = useQuery({ queryKey: [queryKey], queryFn: () => service.fetchAll() });
    const router = useRouter();
    const pathname = usePathname();
    const queryClient = useQueryClient();
    const { showToast } = useApp();


    const handleAddClick = () => {
        const addUrl = `${pathname}/add/`;
        router.push(addUrl);
    };

    const handleEdit = (id: string) => {
        const editUrl = `${pathname}/edit/${id}`;
        router.push(editUrl);
    };

    if (isLoading) {
        return <div>Laddar...</div>;
    }

    if (error) {
        return <div>Ett fel inträffade: {(error as Error).message}</div>;
    }

    const handleDelete = async (id: string) => {
        setToBeDeletedId(id);
        setAlertDialogOpen(true);
    };

    const confirmDelete = async () => {
        try {
            let id = toBeDeletedId!;
            await service.delete(id);
            queryClient.invalidateQueries({ queryKey: [queryKey] });
            setAlertDialogOpen(false);
            showToast('Objektet har raderats', 'success');

        } catch (error) {
            showToast('Kunde inte radera objektet.', 'error');
            console.error(`[${new Date().toISOString()}] ${errorMessage} ${error}`);
        }
    };

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
                            data={mapDataToTableFormat(data!, specification)}
                            isSearchable={true}
                            pagination={true}
                            expandable={expandable}
                            rowsPerPage={10}
                            onAdd={handleAddClick}
                            onEdit={handleEdit}
                            onDelete={handleDelete}
                        />
                    </MainCard>
                </Grid>
                <AlertDialog
                    open={isAlertDialogOpen}
                    onConfirm={confirmDelete}
                    contentText={alertDialogContent}
                    onClose={() => setAlertDialogOpen(false)}
                    title="Bekräfta borttagning"
                />
            </Grid>
        </main>
    );
}