'use client';
import { useState } from 'react';
import {
    GridLegacy as Grid,
    Typography,
    TextField,
    Button,
    FormControlLabel,
    Switch,
    Box
} from "@mui/material";
import MainCard from "@/components/Cards/MainCard/MainCard";
import styles from "@/app/page.module.css";
import { useRouter } from "next/navigation";
import { useApp } from "@/contexts/AppContext";
import { schemaService, JsonSchemaDto } from "@/api/schemaService";
import JSONEditorReact from "@/components/Editors/JSONEditor";
import { globalEventEmitter } from "@/utils/EventEmitter";
import { ExtendedJSONSchema } from '@/shared/interfaces/jsonSchema.interface';

export default function AddSchemaPage() {
    const router = useRouter();
    const { showToast } = useApp();

    const [title, setTitle] = useState('');
    const [name, setName] = useState('');
    const [visible, setVisible] = useState(true);
    const [schemaContent, setSchemaContent] = useState<ExtendedJSONSchema>({
        "$schema": "http://json-schema.org/draft-07/schema#",
        "title": "New Layer Schema",
        "description": "Configuration schema for new layer type",
        "type": "object",
        "required": ["name", "title", "type"],
        "properties": {
            "name": {
                "type": "string",
                "title": "Name"
            },
            "title": {
                "type": "string",
                "title": "Title"
            },
            "type": {
                "type": "string",
                "title": "Type"
            }
        }
    });
    const [submitting, setSubmitting] = useState(false);
    const [nameError, setNameError] = useState('');

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
            await schemaService.add({
                name,
                title: title.trim(),
                schemaContent,
                visible
            } as JsonSchemaDto);

            globalEventEmitter.emit('schema-changed');
            showToast('Schema skapat', 'success');
            router.push('/schemas');
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Ett okänt fel inträffade';
            showToast(`Kunde inte skapa schema: ${errorMessage}`, 'error');
            console.error('[AddSchema] Error creating schema:', error);
        } finally {
            setSubmitting(false);
        }
    };

    const handleCancel = () => {
        router.push('/schemas');
    };

    return (
        <main className={styles.main}>
            <Grid container spacing={2}>
                <Grid item xs={12}>
                    <Typography variant="h3">Skapa nytt schema</Typography>
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
                                        {submitting ? 'Skapar...' : 'Skapa'}
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

