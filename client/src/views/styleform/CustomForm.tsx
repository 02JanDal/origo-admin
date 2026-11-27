import JSONEditor from "@/components/Editors/JSONEditor";
import { CustomStyleDto } from "@/shared/interfaces/dtos";
import { Typography, Divider, GridLegacy as Grid } from "@mui/material";

interface RenderCustomFormProps {
    selectedCustomStyle: CustomStyleDto;
    setSelectedCustomStyle: (value: React.SetStateAction<CustomStyleDto>) => void;
    key: number;
}

export const RenderCustomForm = ({ selectedCustomStyle, setSelectedCustomStyle, key }: RenderCustomFormProps) => {
    const handleJsonInputChange = (value: any) => {
        setSelectedCustomStyle((prevState) => ({
            ...prevState,
            style: value
        }));
    }

    const generateLabel = () => {
        const label = "label";
        return (selectedCustomStyle?.style as { label?: string })?.[label] ?? "Custom style";
    }

    return <>
        <Typography variant="h6">{generateLabel()}</Typography>
        <Divider sx={{ mb: "10px" }} />
        <Grid container spacing={2}>
            <Grid item xs={12} md={12}>
                <JSONEditor key={key} value={selectedCustomStyle.style} onChange={(newValue) => handleJsonInputChange(newValue)} />
            </Grid>
        </Grid>
    </>
}

