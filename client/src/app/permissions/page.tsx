'use client';
import { Backdrop, CircularProgress, GridLegacy as Grid, TextField, Typography } from "@mui/material";
import MainCard from "@/components/Cards/MainCard/MainCard";
import styles from "@/app/page.module.css";
import { useRouter, usePathname } from "next/navigation";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { PermissionService as service } from '@/api';
import DetailedDataTable from "@/components/Tables/DetailedDataTable";
import roleSpec from "@/assets/specifications/tables/RoleTableSpecification.json";
import { mapDataToTableFormat } from "@/utils/mappers/toDataTable";
import { useEffect, useState } from "react";
import { RoleDto } from "@/shared/interfaces/dtos";
import FormDialog from "@/components/Dialogs/FormDialog";
import AlertDialog from "@/components/Dialogs/AlertDialog";
import { useApp } from "@/contexts/AppContext";

export default function Page() {
    const queryKey = 'permissions';
    const { data, isLoading, error } = useQuery({ queryKey: [queryKey], queryFn: () => service.fetchAll() });
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isAlertDialogOpen, setAlertDialogOpen] = useState(false);
    const [toBeDeteledId, setToBeDeletedId] = useState<string | null>(null);
    const [isLoadingOpen, setIsLoadingOpen] = useState(false);
    const [isConfirmDuplicateDialogOpen, setConfirmDuplicateDialogOpen] = useState(false);
    const [selectedRole, setSelectedRole] = useState<any>();
    const { showToast } = useApp();

    const [open, setOpen] = useState(false);
    const handleClose = () => {
        setOpen(false);
    };
    const handleOpen = () => {
        setOpen(true);
    };

    useEffect(() => {
    }, [data]);

    const router = useRouter();
    const pathname = usePathname()


    const handleDialogOpen = () => {
        setErrorMessage(null);
        setIsDialogOpen(true);
    };

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
    const onChange = () => {
        if (setErrorMessage) setErrorMessage(null);
    }
    const confirmDelete = async () => {
        try {
            let id = toBeDeteledId!;
            await service.delete(id);
            queryClient.invalidateQueries({ queryKey: [queryKey] });
            setAlertDialogOpen(false);
            showToast('Rollen har raderats', 'success');
        } catch (error) {
            showToast('Kunde inte radera rollen.', 'error');
            console.error(`[${new Date().toISOString()}] Error deleting role: ${error}`);
        }
    }
    const handleDuplicate = async (id: string) => {
        const selectedRole = data!.find((role: any) => role.id === id);
        setSelectedRole(selectedRole);
        setConfirmDuplicateDialogOpen(true);
    };
    const confirmDuplicate = async () => {
        try {
            await service.duplicate(selectedRole!.id);
            queryClient.invalidateQueries({ queryKey: [queryKey] });
            handleDuplicateDialogClose();
            showToast('Rollen duplicerades', 'success');
        } catch (error) {
            showToast('Ett fel inträffade, rollen kunde inte dupliceras', 'error');
            console.error(`[${new Date().toISOString()}] Error duplicating role: ${error}`);
        }
    }

    const handleDuplicateDialogClose = () => {
        setConfirmDuplicateDialogOpen(false);
        setSelectedRole(undefined);
    }

    const onSubmit = async (formData: FormData) => {
        setIsLoadingOpen(true);
        const entries = Object.fromEntries(formData.entries());

        if (data!.length === 0 || !data?.some((d) => d.role.toLowerCase() === entries.name.toString().toLowerCase())) {
            const newRole: RoleDto = {
                role: entries.name.toString(),
                actors: [],
                permissions: []
            };
            await service.add(newRole).then((dto) => {
                queryClient.invalidateQueries({ queryKey: [queryKey] });
                if (dto.id!) {
                    setIsDialogOpen(false);
                    const editUrl = `${pathname}/edit/${dto.id!}`;
                    setIsLoadingOpen(false);
                    router.push(editUrl);
                }
            }).catch((error) => {
                const message = error.message || "Ett okänt fel inträffade.";
                setErrorMessage(message);
                showToast('Ett fel inträffade.', 'error');
                setIsLoadingOpen(false);

            });
        }
        else {
            setErrorMessage("En roll med samma namn finns redan.");
            setIsLoadingOpen(false);
        }
    }

    const queryClient = useQueryClient();

    if (isLoading) {
        return <div>Laddar...</div>;
    }

    if (error) {
        return <div>Ett fel inträffade: {error.message}</div>;
    }

    return (
        <main className={styles.main}>
            <Grid container spacing={2}>
                <Grid item xs={12}>
                    <Typography variant="h2">Hantera roller</Typography>
                </Grid>
                <Grid item xs={12}>
                    <MainCard>
                        <Grid container rowSpacing={4.5}>
                            <Grid item xs={12} md={12} lg={12}>
                                <DetailedDataTable
                                    data={mapDataToTableFormat(data!, roleSpec.specification)}
                                    isSearchable={true}
                                    expandable={false}
                                    pagination={true}
                                    rowsPerPage={10}
                                    sortingEnabled={true}
                                    customEvents={[
                                        { label: "Duplicera", action: (id) => handleDuplicate(id) },
                                    ]}
                                    onAdd={handleAddClick} onEdit={handleEdit} onDelete={handleDelete}></DetailedDataTable>
                            </Grid>
                        </Grid >
                    </MainCard>
                </Grid>
            </Grid >
            <FormDialog open={isDialogOpen} onClose={() => setIsDialogOpen(false)} title="Skapa ny roll"
                contentText="Skapa ny roll genom att fylla i rollens titel nedan och trycka Skapa."
                onSubmit={onSubmit}
                fieldToValidate="name"
                errorMessage={errorMessage}
                textField={<TextField
                    autoFocus
                    onChange={onChange}
                    required
                    margin="dense"
                    id="name"
                    name="name"
                    label="Namn på roll"
                    type="text"
                    fullWidth
                    variant="standard"
                />} />
            <AlertDialog open={isAlertDialogOpen} onConfirm={confirmDelete} contentText="Vänligen bekräfta borttagning av rollen!"
                onClose={() => setAlertDialogOpen(false)} title="Bekräfta borttagning">
            </AlertDialog>
            <Backdrop
                sx={{ color: '#fff', zIndex: (theme: any) => theme.zIndex.drawer + 1 }}
                open={open}
                onClick={handleClose}
            >
                <CircularProgress color="inherit" />
            </Backdrop>
            <AlertDialog open={isConfirmDuplicateDialogOpen} onClose={() => setConfirmDuplicateDialogOpen(false)} title="Duplicera roll" contentText={`Är du säker på att du vill duplicera rollen "${selectedRole?.role}"?`}
                onConfirm={confirmDuplicate} />
        </main >
    )
}
