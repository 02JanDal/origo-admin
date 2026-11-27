'use client';
import React, { useState, useEffect } from 'react';
import { GridLegacy as Grid, Typography, Stack, TextField, InputLabel, Button } from "@mui/material";
import MainCard from "@/components/Cards/MainCard/MainCard";
import styles from "@/app/page.module.css";
import { useRouter } from "next/navigation";
import JSONEditor from "@/components/Editors/JSONEditor";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { useApp } from '@/contexts/AppContext';

interface GenericJsonFormProps {
    id?: string;
    title: string;
    service: {
        fetch?: (id: string) => Promise<any>;
        add: (data: any) => Promise<any>;
        update: (id: string, data: any) => Promise<any>;
    };
    queryKey: string;
    initialJsonContent: object;
    dtoMapper: (title: string, jsonContent: object, id?: string) => any;
}

export default function GenericJsonForm({
    id,
    title: pageTitle,
    service,
    queryKey,
    initialJsonContent,
    dtoMapper
}: GenericJsonFormProps) {
    const router = useRouter();
    const queryClient = useQueryClient();
    const [formTitle, setFormTitle] = useState('');
    const [jsonContent, setJsonContent] = useState<object>(initialJsonContent);
    const { showToastAfterNavigation, showToast } = useApp();

    const { data } = useQuery({
        queryKey: [queryKey, id],
        queryFn: () => (id && service.fetch ? service.fetch(id) : null),
        enabled: !!id && !!service.fetch
    });

    useEffect(() => {
        if (data) {
            setFormTitle(data.title || '');
            setJsonContent(data.control || data.setting || initialJsonContent);
        }
    }, [data, initialJsonContent]);

    const handleCancelClick = () => {
        router.back();
    };

    const handleOnChange = (json: object) => {
        setJsonContent(json);
    };

    const handleSubmit = async () => {
        const dto = dtoMapper(formTitle, jsonContent, id);
        try {
            if (id) {
                showToastAfterNavigation('Ändringarna har sparats', 'success');
                await service.update(id, dto);
            } else {
                showToastAfterNavigation('Nytt objekt har skapats', 'success');
                await service.add(dto);
            }
            queryClient.invalidateQueries({ queryKey: [queryKey] });
            router.back();
        } catch (error) {
            showToast('Ett fel inträffade. Försök igen senare.', 'error');
            console.error(`[${new Date().toISOString()}] Error ${id ? 'updating' : 'adding'} item:`, error);
        }
    };

    return (
        <main className={styles.main}>
            <Grid container rowSpacing={4.5} columnSpacing={2.75}>
                <Grid item xs={12} sx={{ mb: -2.25 }}>
                    <Typography sx={{ pl: '10px' }} variant="h5">{pageTitle}</Typography>
                </Grid>
                <Grid item xs={12}>
                    <MainCard>
                        <Grid container spacing={1}>
                            <Grid item xs={12}>
                                <InputLabel>Titel</InputLabel>
                                <TextField
                                    value={formTitle}
                                    onChange={(e) => setFormTitle(e.target.value)}
                                    fullWidth
                                    variant="outlined"
                                />
                            </Grid>
                            <Grid item xs={12}>
                                <InputLabel>{id ? 'Control/Inställningar' : 'Control'}</InputLabel>
                                <JSONEditor value={jsonContent} onChange={handleOnChange} />
                            </Grid>
                        </Grid>
                        <Grid item xs={12}>
                            <Stack direction="row" justifyContent="flex-end" sx={{ mt: 2 }}>
                                <Button variant="contained" sx={{ mr: 1, backgroundColor: "red" }} onClick={handleCancelClick}>
                                    Avbryt
                                </Button>
                                <Button variant="contained" disabled={!formTitle} onClick={handleSubmit}>
                                    {id ? 'Uppdatera' : 'Lägg till'}
                                </Button>
                            </Stack>
                        </Grid>
                    </MainCard>
                </Grid>
            </Grid>
        </main>
    );
}