'use client';
import { useState, useEffect, use } from 'react';
import {
    GridLegacy as Grid,
    Typography,
    TextField,
    Button,
    FormControlLabel,
    Switch,
    Box,
    CircularProgress
} from "@mui/material";
import MainCard from "@/components/Cards/MainCard/MainCard";
import styles from "@/app/page.module.css";
import { useRouter } from "next/navigation";
import { useApp } from "@/contexts/AppContext";
import { schemaService, JsonSchemaDto } from "@/api/schemaService";
import JSONEditorReact from "@/components/Editors/JSONEditor";
import { globalEventEmitter } from "@/utils/EventEmitter";

interface EditSchemaPageProps {
    params: Promise<{
        id: string;
    }>;
}

export default function EditSchemaPage(props: EditSchemaPageProps) {
    const params = use(props.params);
    const router = useRouter();
    const { showToast } = useApp();

    const [loading, setLoading] = useState(true);
    const [schema, setSchema] = useState<JsonSchemaDto | null>(null);
    const [title, setTitle] = useState('');
    const [name, setName] = useState('');
    const [visible, setVisible] = useState(true);
    const [schemaContent, setSchemaContent] = useState<any>({});
    const [submitting, setSubmitting] = useState(false);
    const [nameError, setNameError] = useState('');

    useEffect(() => {
        const loadSchema = async () => {
            try {
                setLoading(true);
                const data = await schemaService.fetch(params.id);
                setSchema(data);
                setTitle(data.title);
                setName(data.name);
                setVisible(data.visible);
                setSchemaContent(data.schemaContent);
            } catch (error) {
                showToast('Kunde inte ladda schema', 'error');
                console.error('[EditSchema] Error loading schema:', error);
                router.push('/schemas');
            } finally {
                setLoading(false);
            }
        };

        loadSchema();
    }, [params.id, router, showToast]);

    const validateName = (value: string): boolean => {
        if (!value) {
            setNameError('Namn är obligatoriskt');
            return false;
        }
        if (!/^[a-z0-9-]+$/.test(value)) {
            setNameError('Namn får endast innehålla gemener (a-z), siffror (0-9) och bindestreck (-)');
            return false;
        }
        setNameError('');
        return true;
    };

    const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value.toLowerCase();
        setName(value);
        if (value) {
            validateName(value);
        } else {
            setNameError('');
        }
    };

    const handleSubmit = async () => {
        if (!title.trim()) {
            showToast('Titel är obligatorisk', 'error');
            return;
        }

        if (!validateName(name)) {
            return;
        }

        setSubmitting(true);
        try {
            await schemaService.update(params.id, {
                id: params.id,
                name,
                title: title.trim(),
                schemaContent,
                visible
            } as JsonSchemaDto);

            globalEventEmitter.emit('schema-changed');
            showToast('Schema uppdaterat', 'success');
            router.push('/schemas');
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Ett okänt fel inträffade';
            showToast(`Kunde inte uppdatera schema: ${errorMessage}`, 'error');
            console.error('[EditSchema] Error updating schema:', error);
        } finally {
            setSubmitting(false);
        }
    };

    const handleCancel = () => {
        router.push('/schemas');
    };

    if (loading) {
        return (
            <main className={styles.main}>
                <Grid container spacing={2}>
                    <Grid item xs={12}>
                        <Typography variant="h3">Redigera schema</Typography>
                    </Grid>
                    <Grid item xs={12}>
                        <MainCard>
                            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                                <CircularProgress />
                            </Box>
                        </MainCard>
                    </Grid>
                </Grid>
            </main>
        );
    }

    if (!schema) {
        return (
            <main className={styles.main}>
                <Grid container spacing={2}>
                    <Grid item xs={12}>
                        <Typography variant="h3">Schema hittades inte</Typography>
                    </Grid>
                </Grid>
            </main>
        );
    }

    return (
        <main className={styles.main}>
            <Grid container spacing={2}>
                <Grid item xs={12}>
                    <Typography variant="h3">Redigera schema</Typography>
                </Grid>

                <Grid item xs={12}>
                    <MainCard>
                        <Grid container spacing={3}>
                            <Grid item xs={12} md={6}>
                                <TextField
                                    fullWidth
                                    label="Titel"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    helperText="Visningsnamn för schemat i menyn"
                                    required
                                />
                            </Grid>

                            <Grid item xs={12} md={6}>
                                <TextField
                                    fullWidth
                                    label="Namn"
                                    value={name}
                                    onChange={handleNameChange}
                                    error={!!nameError}
                                    helperText={nameError || "URL-säkert namn (endast a-z, 0-9, och -)"}
                                    required
                                />
                            </Grid>

                            <Grid item xs={12}>
                                <FormControlLabel
                                    control={
                                        <Switch
                                            checked={visible}
                                            onChange={(e) => setVisible(e.target.checked)}
                                        />
                                    }
                                    label="Synlig i menyn"
                                />
                            </Grid>

                            <Grid item xs={12}>
                                <Typography variant="h6" gutterBottom>
                                    Schema-definition (JSON Schema)
                                </Typography>
                                <Box sx={{
                                    height: 'calc(100vh - 450px)',
                                    minHeight: '400px',
                                    '& > div': {
                                        height: '100% !important',
                                        maxHeight: 'none !important'
                                    }
                                }}>
                                    <JSONEditorReact
                                        value={schemaContent}
                                        onChange={setSchemaContent}
                                    />
                                </Box>
                            </Grid>

                            <Grid item xs={12}>
                                <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                                    <Button
                                        variant="outlined"
                                        onClick={handleCancel}
                                        disabled={submitting}
                                    >
                                        Avbryt
                                    </Button>
                                    <Button
                                        variant="contained"
                                        onClick={handleSubmit}
                                        disabled={submitting || !title || !name || !!nameError}
                                    >
                                        {submitting ? 'Uppdaterar...' : 'Uppdatera'}
                                    </Button>
                                </Box>
                            </Grid>
                        </Grid>
                    </MainCard>
                </Grid>
            </Grid>
        </main>
    );
}

