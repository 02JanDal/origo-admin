'use client';
import { GridLegacy as Grid, Typography, TextField } from "@mui/material";
import MainCard from "@/components/Cards/MainCard/MainCard";
import styles from "@/app/page.module.css";
import { useRouter, usePathname } from "next/navigation";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { StyleService as service } from "@/api";

import styleSchemaSpec from "@/assets/specifications/tables/styleSchemaTableSpecification.json";
import { useEffect, useState } from "react";
import DetailedDataTable from "@/components/Tables/DetailedDataTable";
import { mapDataToTableFormat } from "@/utils/mappers/toDataTable";
import { StyleSchemaDto, StyleType, StyleItemDto } from "@/shared/interfaces/dtos";
import FormDialog from "@/components/Dialogs/FormDialog";
import AlertDialog from "@/components/Dialogs/AlertDialog";
import { useApp } from "@/contexts/AppContext";

export default function Page() {
    const queryKey = "styleSchemas";
    const { data, isLoading, error } = useQuery({ queryKey: [queryKey], queryFn: () => service.fetchAll() });
    const router = useRouter();
    const pathname = usePathname()
    const queryClient = useQueryClient();
    const [flattenedData, setFlattenedData] = useState<any[]>([]);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isAlertDialogOpen, setAlertDialogOpen] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [toBeDeteledId, setToBeDeletedId] = useState<string | null>(null);
    const { showToast } = useApp();

    interface flattenedStyleSchemaData {
        id: string;
        name: string;
        nrOfIconStyles: number;
        nrOfUnspecifiedStyles: number;
    }
    const handleDialogOpen = () => {
        setErrorMessage(null);
        setIsDialogOpen(true);
    };

    const handleDialogClose = () => {
        setIsDialogOpen(false);
    };

    useEffect(() => {
        if (data) {
            setFlattenedData(data.map((styleSchema: StyleSchemaDto) => {
                const flattenedStyleSchema: flattenedStyleSchemaData = {
                    id: styleSchema.id!,
                    name: styleSchema.name,
                    nrOfIconStyles: styleSchema.styles.filter(style => style[0].type === StyleType.Icon).length,
                    nrOfUnspecifiedStyles: styleSchema.styles.filter(style => style[0].type === StyleType.Custom).length
                }
                return flattenedStyleSchema;
            }));
        }
    }, [data]);


    const onSubmit = async (e: FormData) => {
        const entries = Object.fromEntries(e.entries());

        if (data?.length === 0 || !data?.some((styleSchema: StyleSchemaDto) => styleSchema.name.toLowerCase() === entries.name.toString().toLowerCase())) {
            const newStyleSchema: StyleSchemaDto = {
                name: entries.name.toString(),
                styles: []
            };

            await service.add(newStyleSchema).then((dto) => {
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
            setErrorMessage("Stilschema med samma namn finns redan.");
        }
    }
    const onChange = () => {
        if (setErrorMessage) setErrorMessage(null);
    }

    const handleAddClick = () => {
        handleDialogOpen();
    };
    const handleEdit = (id: string) => {
        const editUrl = `${pathname}/edit/${id}`;
        router.push(editUrl);
    };

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
            showToast('Stilschemat har raderats!', 'success');

        } catch (error) {
            showToast('Stilschemat kunde inte raderas', 'error');
            console.error(`[${new Date().toISOString()}] Error deleting style Layer: ${error}`);
        }
    }

    return (
        <main className={styles.main}>
            <Grid container spacing={2}>
                <Grid item xs={12}>
                    <Typography variant="h2">Stilschema</Typography>
                </Grid>
                <Grid item xs={12}>
                    <MainCard>
                        <Grid container rowSpacing={4.5}>
                            <Grid item xs={12} md={12} lg={12}>
                                {flattenedData && <DetailedDataTable
                                    data={mapDataToTableFormat(flattenedData!, styleSchemaSpec.specification)}
                                    isSearchable={true}
                                    pagination={true}
                                    rowsPerPage={10}
                                    onAdd={handleAddClick} onEdit={handleEdit} onDelete={handleDelete}></DetailedDataTable>}
                            </Grid>
                            <FormDialog open={isDialogOpen} onClose={handleDialogClose} title="Skapa nytt Stilschema"
                                contentText="Skapa nytt stilschema genom att fylla i namn nedan och trycka Skapa."
                                onSubmit={onSubmit}
                                errorMessage={errorMessage}
                                fieldToValidate="name"
                                textField={<TextField
                                    autoFocus
                                    onChange={onChange}
                                    required
                                    margin="dense"
                                    id="name"
                                    name="name"
                                    label="Namn på stilschema"
                                    type="text"
                                    fullWidth
                                    variant="standard"
                                />} />
                            <AlertDialog open={isAlertDialogOpen} onConfirm={confirmDelete} contentText="Vänligen bekräfta borttagning av stilschema!"
                                onClose={() => setAlertDialogOpen(false)} title="Bekräfta borttagning">

                            </AlertDialog>
                        </Grid >
                    </MainCard>
                </Grid>
            </Grid >
        </main>
    );
}

