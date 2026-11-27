'use client';
import { GridLegacy as Grid, Typography } from "@mui/material";
import MainCard from "@/components/Cards/MainCard/MainCard";
import styles from "@/app/page.module.css";
import { useRouter, usePathname } from "next/navigation";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import DetailedDataTable from "@/components/Tables/DetailedDataTable";
import AlertDialog from "@/components/Dialogs/AlertDialog";
import React, { useState } from "react";
import { useApp } from "@/contexts/AppContext";
import { schemaService, JsonSchemaDto } from "@/api/schemaService";
import { globalEventEmitter } from "@/utils/EventEmitter";
import { TableData } from "@/interfaces/detailedDataTable";

export default function SchemasListingView() {
    const queryKey = 'jsonschemas';
    const { data, isLoading, error } = useQuery({
        queryKey: [queryKey],
        queryFn: () => schemaService.fetchAll(),
    });

    const [isAlertDialogOpen, setAlertDialogOpen] = useState(false);
    const [selectedSchema, setSelectedSchema] = useState<JsonSchemaDto | undefined>();
    const queryClient = useQueryClient();
    const { showToast } = useApp();

    const router = useRouter();
    const pathname = usePathname();

    const handleAddClick = () => {
        router.push(`${pathname}/add`);
    };

    const handleEdit = (id: string) => {
        router.push(`${pathname}/edit/${id}`);
    };

    const handleDelete = async (id: string) => {
        const schema = data!.find((s: JsonSchemaDto) => s.id === id);
        setSelectedSchema(schema);
        setAlertDialogOpen(true);
    };

    const confirmDelete = async () => {
        try {
            if (selectedSchema?.id) {
                await schemaService.delete(selectedSchema!.id);
                queryClient.invalidateQueries({ queryKey: [queryKey] });
                globalEventEmitter.emit('schema-changed');
                setAlertDialogOpen(false);
                setSelectedSchema(undefined);
                showToast('Schemat har raderats', 'success');
            }
        } catch (error) {
            showToast('Ett fel inträffade när schemat skulle raderas.', 'error');
            console.error(`[${new Date().toISOString()}] Error deleting schema: ${error}`);
        }
    };

    if (isLoading) {
        return (
            <main className={styles.main}>
                <Grid container spacing={2}>
                    <Grid item xs={12}>
                        <Typography variant="h3">Scheman</Typography>
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
                        <Typography variant="h3">Scheman</Typography>
                    </Grid>
                    <Grid item xs={12}>
                        <MainCard>
                            <div>Ett fel inträffade: {(error as Error).message}</div>
                        </MainCard>
                    </Grid>
                </Grid>
            </main>
        );
    }

    const tableData = {
        columns: [
            {
                field: 'name',
                headerName: 'Namn'
            },
            {
                field: 'title',
                headerName: 'Titel'
            },
            {
                field: 'visible',
                headerName: 'Synlig'
            },
            {
                field: 'createdAt',
                headerName: 'Skapad'
            },
            {
                field: 'updatedAt',
                headerName: 'Uppdaterad'
            }
        ],
        rows: data!.map((schema: JsonSchemaDto) => ({
            id: schema.id,
            name: schema.name,
            title: schema.title,
            visible: schema.visible ? 'Ja' : 'Nej',
            createdAt: new Date(schema.createdAt!).toLocaleDateString('sv-SE'),
            updatedAt: new Date(schema.updatedAt!).toLocaleDateString('sv-SE'),
        }))
    };

    return (
        <main className={styles.main}>
            <Grid container spacing={2}>
                <Grid item xs={12}>
                    <Typography variant="h3">Scheman</Typography>
                </Grid>
                <Grid item xs={12}>
                    <MainCard>
                        <Grid container rowSpacing={4.5}>
                            <Grid item xs={12} md={12} lg={12}>
                                <DetailedDataTable
                                    data={tableData as TableData}
                                    isSearchable={true}
                                    expandable={false}
                                    pagination={true}
                                    rowsPerPage={10}
                                    sortingEnabled={true}
                                    onAdd={handleAddClick}
                                    onEdit={handleEdit}
                                    onDelete={handleDelete}
                                />
                            </Grid>
                        </Grid>
                    </MainCard>
                </Grid>
            </Grid>

            {selectedSchema && (
                <AlertDialog
                    open={isAlertDialogOpen}
                    onConfirm={confirmDelete}
                    contentText={`Vänligen bekräfta borttagning av schemat ${selectedSchema.title}!`}
                    onClose={() => {
                        setAlertDialogOpen(false);
                        setSelectedSchema(undefined);
                    }}
                    title="Bekräfta borttagning"
                />
            )}
        </main>
    );
}

