import { MediaSelector } from "@/components/Selects/MediaSelector";
import { IconStyleDto } from "@/shared/interfaces/dtos";
import { Typography, Divider, GridLegacy as Grid, InputLabel, TextField, Switch } from "@mui/material";
import { ChangeEvent } from "react";

interface RenderIconFormProps {
    selectedIconStyle: IconStyleDto;
    setSelectedIconStyle: (value: React.SetStateAction<IconStyleDto>) => void;
}
export const RenderIconForm = ({
    selectedIconStyle,
    setSelectedIconStyle,
}: RenderIconFormProps) => {

    const handleInputChange = (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = event.target;
        setSelectedIconStyle((prevState) => ({
            ...prevState,
            [name]: value,
        }));
    };
    const handleSwitchChange = (event: React.ChangeEvent<HTMLInputElement>, checked: boolean) => {
        const { name } = event.target;
        setSelectedIconStyle((prevState) => ({
            ...prevState,
            [name]: checked,
        }));
    };
    const handleMediaSelect = (fileInfo: { file: string, fileIncPath: string }) => {
        setSelectedIconStyle((prevState) => ({
            ...prevState,
            icon: { ...prevState.icon, src: fileInfo.fileIncPath },
        }));
    };

    return <>
        <Typography variant="h6">{selectedIconStyle?.label}</Typography>
        <Divider sx={{ mb: "10px" }} />
        <Grid container spacing={2}>
            <Grid item xs={12} md={12}>
                <InputLabel>Label</InputLabel>
                <TextField
                    name="label"
                    variant="outlined"
                    fullWidth
                    value={selectedIconStyle?.label ?? ""}
                    onChange={handleInputChange} />
            </Grid>
            <Grid item xs={12} md={12}>
                <InputLabel>Filter</InputLabel>
                <TextField
                    name="filter"
                    placeholder="[anknytning] == 'Pendeltåg' AND [avgift] == 'Taxa B"
                    variant="outlined"
                    fullWidth
                    value={selectedIconStyle?.filter ?? ""}
                    onChange={handleInputChange} />
            </Grid>
            <Grid item xs={6} md={3}>
                <InputLabel>Header</InputLabel>
                <Switch value={"header"} checked={selectedIconStyle?.header === true} name="header" onChange={handleSwitchChange} />
            </Grid>
            <Grid item xs={6} md={3}>
                <InputLabel>Hidden</InputLabel>
                <Switch value={"hidden"} checked={selectedIconStyle?.hidden === true} name="hidden" onChange={handleSwitchChange} />
            </Grid>
            <Grid item xs={6} md={3}>
                <InputLabel>ExtendedLegend</InputLabel>
                <Switch
                    checked={!!selectedIconStyle?.extendedLegend}
                    onChange={handleSwitchChange}
                    name="extendedLegend" />
            </Grid>
            <Grid item xs={6} md={3}>
                <InputLabel>Background</InputLabel>
                <Switch
                    checked={!!selectedIconStyle?.background}
                    onChange={handleSwitchChange}
                    name="background" />
            </Grid>
            {!selectedIconStyle?.extendedLegend && (
                <>
                    <Grid item xs={12} md={12}>
                        <MediaSelector mediaToSelect={selectedIconStyle?.icon.src} onMediaSelect={handleMediaSelect} />
                    </Grid>
                    <Grid item xs={12} md={12}>
                        <InputLabel>{selectedIconStyle?.icon.src}</InputLabel>
                    </Grid>
                </>
            )}
            <Grid item xs={12} md={12}>
                {selectedIconStyle?.extendedLegend && (
                    <TextField variant="outlined" fullWidth value={selectedIconStyle?.icon.src}
                        onChange={(e) => setSelectedIconStyle(prev => ({
                            ...prev,
                            icon: { ...prev.icon, src: e.target.value }
                        }))}
                    />
                )}
            </Grid>
        </Grid>
    </>;
}
