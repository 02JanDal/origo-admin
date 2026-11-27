import React, { useState, useEffect } from 'react';
import { GridLegacy as Grid, Typography, Stack, TextField, InputLabel, Button, FormControl, MenuItem } from "@mui/material";
import MainCard from "@/components/Cards/MainCard/MainCard";
import styles from "@/app/page.module.css";
import { LINK_RESOURCE_TYPES } from '@/constants/';
import { LinkResourceDto } from "@/shared/interfaces/dtos";
import KeyValuePairEditor from '@/components/Editors/KeyValuePairEditor';

interface LinkResourceViewProps {
    existingData?: LinkResourceDto[];
    initialData?: LinkResourceDto;
    onSubmit: (data: LinkResourceDto) => void;
    onCancel: () => void;
    submitButtonText: string;
    title: string;
}

export default function LinkResourceView({ existingData = [], initialData, onSubmit, onCancel, submitButtonText, title }: LinkResourceViewProps) {
    const linkResourceTypesArray = Object.values(LINK_RESOURCE_TYPES);
    const [name, setName] = useState(initialData?.name || '');
    const [url, setUrl] = useState(initialData?.url || '');
    const [formTitle, setFormTitle] = useState(initialData?.title || '');
    const [type, setType] = useState(initialData?.type || '');
    const [isUrlValid, setIsUrlValid] = useState(true);
    const [nameError, setNameError] = useState('');
    const [titleError, setTitleError] = useState('');
    const [extendedAttributes, setExtendedAttributes] = useState<{ key: string; value: string }[]>(initialData?.extendedAttributes || []);


    useEffect(() => {
        if (initialData) {
            setName(initialData.name || '');
            setUrl(initialData.url || '');
            setFormTitle(initialData.title || '');
            setType(initialData.type || '');
            setExtendedAttributes(initialData.extendedAttributes || []);
        }
    }, [initialData]);

    const handleExtendedAttributesChange = (newPairs: { key: string; value: string }[]) => {
        setExtendedAttributes(newPairs);
    };

    const validateUrl = (url: string) => {
        const pattern = new RegExp('^(https?:\\/\\/)?' +
            '((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|' +
            '((\\d{1,3}\\.){3}\\d{1,3})|' +
            '(localhost))' +
            '(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*' +
            '(\\?[;&a-z\\d%_.~+=,-]*)?' +
            '(\\#[-a-z\\d_]*)?$', 'i');
        return !!pattern.test(url);
    }

    const checkDuplicate = (field: 'name' | 'title', value: string) => {
        return existingData.some(item =>
            item[field].toLowerCase() === value.toLowerCase() && item.id !== initialData?.id
        );
    }

    const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newName = e.target.value;
        setName(newName);
        if (checkDuplicate('name', newName)) {
            setNameError('En länkresurs med detta namn finns redan');
        } else {
            setNameError('');
        }
    };

    const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newTitle = e.target.value;
        setFormTitle(newTitle);
        if (checkDuplicate('title', newTitle)) {
            setTitleError('En länkresurs med denna titel finns redan');
        } else {
            setTitleError('');
        }
    };

    const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newUrl = e.target.value;
        setUrl(newUrl);
        setIsUrlValid(validateUrl(newUrl));
    };

    const handleSubmit = () => {
        if (!nameError && !titleError) {
            onSubmit({ id: initialData?.id, name, url, title: formTitle, type, extendedAttributes });
        }
    };

    const handleKeyPress = (event: React.KeyboardEvent) => {
        if (event.key === 'Enter' && name && url && isUrlValid && !nameError && !titleError) {
            event.preventDefault();
            handleSubmit();
        }
    };

    const isSubmitDisabled = !name || !url || !isUrlValid || !!nameError || !!titleError;

    return (
        <main className={styles.main}>
            <Grid container rowSpacing={4.5} columnSpacing={2.75}>
                <Grid item xs={12} sx={{ mb: -2.25 }}>
                    <Typography sx={{ pl: '10px' }} variant="h5">{title}</Typography>
                </Grid>
                <Grid item xs={12}>
                    <MainCard>
                        <Grid container spacing={1}>
                            <Grid item xs={12}>
                                <InputLabel>Titel</InputLabel>
                                <TextField
                                    id="link-resource-title"
                                    value={formTitle}
                                    onChange={handleTitleChange}
                                    onKeyPress={handleKeyPress}
                                    fullWidth
                                    variant="outlined"
                                    error={!!titleError}
                                    helperText={titleError}
                                />
                            </Grid>
                            <Grid item xs={12}>
                                <InputLabel>Namn</InputLabel>
                                <TextField
                                    id="link-resource-name"
                                    value={name}
                                    onChange={handleNameChange}
                                    onKeyPress={handleKeyPress}
                                    fullWidth
                                    variant="outlined"
                                    error={!!nameError}
                                    helperText={nameError}
                                />
                            </Grid>
                            <Grid item xs={12}>
                                <InputLabel>URL</InputLabel>
                                <TextField
                                    id="link-resource-url"
                                    fullWidth
                                    variant="outlined"
                                    value={url}
                                    onChange={handleUrlChange}
                                    onKeyPress={handleKeyPress}
                                    error={!isUrlValid}
                                    helperText={!isUrlValid && "Felaktig URL"}
                                />
                            </Grid>
                            <Grid item xs={12}>
                                <InputLabel>Custom Properties</InputLabel>
                                <KeyValuePairEditor
                                    value={extendedAttributes}
                                    onChange={handleExtendedAttributesChange}
                                />
                            </Grid>
                            <Grid item xs={12}>
                                <InputLabel>Typ av tjänst</InputLabel>
                                <FormControl fullWidth>
                                    <TextField
                                        select
                                        variant="outlined"
                                        value={type}
                                        onChange={(e) => setType(e.target.value)}
                                    >
                                        {linkResourceTypesArray.map(typeOption => (
                                            <MenuItem key={typeOption} value={typeOption}>{typeOption}</MenuItem>
                                        ))}
                                    </TextField>
                                </FormControl>
                            </Grid>
                        </Grid>
                        <Grid item xs={12}>
                            <Stack direction="row" justifyContent="flex-end" sx={{ mt: 2 }}>
                                <Button variant="contained" type="submit" sx={{ mr: 1, backgroundColor: "red" }} onClick={onCancel}>
                                    Avbryt
                                </Button>
                                <Button variant="contained" type="submit" disabled={isSubmitDisabled} onClick={handleSubmit}>
                                    {submitButtonText}
                                </Button>
                            </Stack>
                        </Grid>
                    </MainCard>
                </Grid>
            </Grid>
        </main>
    );
}