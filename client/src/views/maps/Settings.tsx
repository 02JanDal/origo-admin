import React, { useEffect, useState } from 'react';
import { TextField, Select, MenuItem, Button, Box, Stack, InputLabel, Tooltip, FormControlLabel, Switch } from '@mui/material';
import { MapSettingDto } from '@/shared/interfaces/dtos';
import { z } from 'zod';
import { MapSettingService as service } from '@/api';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

interface SettingsProps {
    onSave: (title: string, name: string, settings: MapSettingDto, abstract?: string, isPublic?: boolean) => void;
    title: string;
    name: string;
    abstract: string;
    isPublic: boolean;
    settings: MapSettingDto | null;
}

const Settings = ({ onSave, title, name, settings, abstract, isPublic }: SettingsProps) => {
    const settingsSchema = z.object({
        title: z.string().min(1, 'Titel krävs'),
        name: z.string().min(1, 'Namn krävs'),
        abstract: z.string().optional(),
        settings: z.object({
            title: z.string()
                .refine(val => val !== '', { message: 'Inställningens titel får inte vara tom' })
                .refine(val => val !== 'Välj inställningar', { message: 'Du måste välja en inställning' })
        })
    });

    const { register, formState: { errors } } = useForm({
        resolver: zodResolver(settingsSchema),
        mode: 'onBlur',
    });
    const queryKey = 'mapSettings';
    const queryClient = useQueryClient();
    const defaultSettings = "Välj inställningar";
    const [selectedSetting, setSelectedSetting] = useState('');
    const [_title, setTitle] = useState(title);
    const [_name, setName] = useState(name);
    const [_abstract, setAbstract] = useState(abstract);
    const [_isPublic, setIsPublic] = useState(isPublic);
    const { data } = useQuery({ queryKey: [queryKey], queryFn: () => service.fetchAll() });

    useEffect(() => {
        queryClient.invalidateQueries({ queryKey: [queryKey] });
        setIsPublic(isPublic);
        if (settings != undefined) {
            setSelectedSetting(settings!.title);
        }
        else if (data != undefined && data.length > 0) {
            setSelectedSetting(defaultSettings);
        }
    }, [data]);

    const handleTextFieldChange = (field: string, value: string) => {
        if (field !== null) {
            switch (field) {
                case 'title':
                    setTitle(value);
                    break;
                case 'name':
                    setName(value);
                    break;
                case 'abstract':
                    setAbstract(value);
                    break;
                default:
                    break;
            }
        }
    }

    function getErrorMessage(error: any) {
        return error?.message ? String(error.message) : '';
    }

    function saveIsDisabled() {
        return Boolean(errors.title) || Boolean(errors.name) || selectedSetting === defaultSettings;
    }

    const onHandleSave = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const selected = data!.find(setting => setting.title === selectedSetting);
        onSave(_title, _name, selected!, _abstract, _isPublic);
    }

    const handleSettingChange = (event: any) => {
        const setting = data!.find(setting => setting.title === event.target.value);
        if (setting === undefined) setSelectedSetting(defaultSettings);
        setSelectedSetting(event.target.value);
    };

    return (
        <Box component='form' onSubmit={(e) => (onHandleSave(e))}>
            <InputLabel>Titel</InputLabel>
            <TextField
                {...register('title')}
                error={Boolean(errors.title)}
                helperText={getErrorMessage(errors.title)}
                value={_title}
                onChange={(e) => handleTextFieldChange('title', e.target.value)}
                fullWidth
                margin="normal"
            />
            <Stack direction="row" justifyContent="flex-start" alignItems="center" spacing={1}>
                <InputLabel htmlFor="name-input">Namn</InputLabel>
                <Tooltip describeChild title="Ändra INTE denna om ej nödvändigt då detta styr hur kartainstansen visas externt/internt!">
                    <Button>Viktigt!</Button>
                </Tooltip>
            </Stack>
            <TextField
                {...register('name')}
                error={Boolean(errors.name)}
                helperText={getErrorMessage(errors.name)}
                value={_name}
                onChange={(e) => handleTextFieldChange('name', e.target.value)}
                fullWidth
                margin="normal"
            />
            <InputLabel>Beskrivning</InputLabel>
            <TextField
                {...register('abstract')}
                error={Boolean(errors.abstract)}
                helperText={getErrorMessage(errors.abstract)}
                value={_abstract}
                onChange={(e) => handleTextFieldChange('abstract', e.target.value)}
                fullWidth
                multiline
                minRows={6}
                margin="normal"
            />
            <FormControlLabel
                control={<Switch checked={_isPublic} onChange={(_event, checked) => setIsPublic(checked)} />}
                label="Publik kartinstans"
            />

            <InputLabel>Inställningar</InputLabel>
            {data && selectedSetting && (<Select
                labelId="settings-select-label"
                value={selectedSetting}
                label="Settings"
                onChange={handleSettingChange}
            >
                <MenuItem value={defaultSettings}>{defaultSettings}</MenuItem>
                {data!.map((setting) => (
                    <MenuItem key={setting.id} value={setting.title}>{setting.title}</MenuItem>
                ))}
            </Select>)}
            <Stack direction="row" justifyContent="flex-end" spacing={2} sx={{ marginTop: 'auto', paddingTop: 2 }}>
                <Button variant="contained" type="submit" disabled={saveIsDisabled()} >
                    Spara
                </Button>
            </Stack>

        </Box>
    );
};

export default Settings;