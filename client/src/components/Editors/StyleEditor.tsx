import React, { useEffect, useState } from "react";
import {
    List,
    ListItemText,
    Divider,
    Paper,
    Button,
    Box,
    Typography,
    GridLegacy as Grid,
    ListItemButton,
    ListSubheader,
    Stack,
    IconButton,
} from "@mui/material";
import { v4 as uuidv4 } from "uuid"
import { CustomStyleDto, IconStyleDto, StyleItemDto, StyleSchemaDto, StyleType } from "@/shared/interfaces/dtos";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { StyleService as service } from "@/api";
import { RenderIconForm } from "@/views/styleform/IconForm";
import { RenderCustomForm } from "@/views/styleform/CustomForm";
import { isEqual, set } from "lodash";
import { getIcon } from "@/utils/helpers/iconHelper";
import { useApp } from "@/contexts/AppContext";

interface StyleEditorProps {
    id: string;
    onRouterBackClick?: () => void;
}

export const StyleEditor = ({ onRouterBackClick, id }: StyleEditorProps) => {
    const queryKey = "styleSchema";
    const { data } = useQuery({ queryKey: [queryKey], queryFn: () => service.fetch(id), refetchOnWindowFocus: false });
    const [styleSchema, setStyleSchema] = useState(null as unknown as StyleSchemaDto);
    const [selectedStyleType, setSelectedStyleType] = useState(null as unknown as StyleType);
    const [activeItem, setActiveItem] = useState(null as unknown as StyleItemDto);
    const [isEditorValid, setIsEditorValid] = useState(true);
    const [saveEnabled, setSaveEnabled] = useState(false);
    const queryClient = useQueryClient();
    const BACKGROUND_COLOR = "#1890ff";
    const BACKGROUND_COLOR_HOVER = "#e6f7ff";
    const DeleteComponent = getIcon('DeleteOutline', '#1890FF', 25);
    const [key, setKey] = useState(0);
    const { showToast } = useApp();

    useEffect(() => {
        if (data) {
            setStyleSchema(data);
        }
    }, [data]);

    useEffect(() => {
        if (selectedStyleType === StyleType.Icon && activeItem) {
            let iconStyle = activeItem as IconStyleDto;
            if (iconStyle.icon.src === '') {
                setIsEditorValid(false);
                setSaveEnabled(false);
                return;
            }
            if (styleSchema && activeItem) {
                const styleItem = styleSchema.styles.flat().find(item => item.id === activeItem.id);
                let sanitizedObj = sanitizeObject({ ...iconStyle }) as IconStyleDto;
                if (styleItem && !isEqual(styleItem, sanitizedObj)) {
                    setIsEditorValid(false);
                    setSaveEnabled(true);
                    return;
                }
            }
            setIsEditorValid(true);
            setSaveEnabled(false);
            return;
        }

        if (selectedStyleType === StyleType.Custom && activeItem) {
            let customStyle = activeItem as CustomStyleDto;
            if (Object.keys(customStyle.style).length === 0) {
                setIsEditorValid(false);
                setSaveEnabled(false);
                return;
            }
            const styleItem = (styleSchema.styles.flat().find(item => item.id === activeItem.id)) as CustomStyleDto;
            if (styleSchema && activeItem) {

                if (styleItem?.label != customStyle.label) {
                    setIsEditorValid(false);
                    setSaveEnabled(true);
                    return;
                }

            }
            if (customStyle.style != styleItem.style) {
                setIsEditorValid(false);
                setSaveEnabled(true);
                return;
            }
            setIsEditorValid(true);
            setSaveEnabled(false);

        }
    }, [activeItem]);

    function sanitizeObject(obj: any) {
        Object.keys(obj).forEach(key => {
            if (obj[key] === '' || obj[key] === false) {
                delete obj[key];
            } else if (typeof obj[key] === 'object' && obj[key] !== null && !(obj[key] instanceof Date)) {
                sanitizeObject(obj[key]);
            }
        });
        return obj;
    }

    const handleListItemClick = (style: StyleItemDto) => {
        setActiveItem(style);
        setKey(key + 1);
        if (style.type === StyleType.Icon) {
            setSelectedStyleType(StyleType.Icon);
        } else if (style.type === StyleType.Custom) {
            setSelectedStyleType(StyleType.Custom);
        }
    };

    const handleSave = async () => {
        try {
            if (!styleSchema || (!activeItem)) return;
            const updatedStyles = styleSchema.styles.map(styleRow =>
                styleRow.map(styleItem => {
                    if (activeItem && styleItem.id === activeItem.id) {
                        return sanitizeObject({ ...activeItem });
                    }
                    return styleItem;
                })
            );
            const updatedStyleSchema = {
                ...styleSchema,
                styles: updatedStyles
            };
            setStyleSchema(updatedStyleSchema);
            await service.update(updatedStyleSchema.id!, updatedStyleSchema);
            resetForm();
            showToast('Ändringarna har sparats', 'success');
        } catch (error) {
            showToast('Ändringarna kunde inte sparas!', 'error');
            console.error(`[${new Date().toISOString()}] ${error}`);
        }
    }
    const handleCancelClick = () => {
        resetForm();
    }

    const resetForm = () => {
        setActiveItem(null!);
        setIsEditorValid(true);
        setSelectedStyleType(null!);
        setSaveEnabled(false);
        queryClient.invalidateQueries({ queryKey: ['styleSchema'] });
    }

    const generateListItemLabel = (data: StyleSchemaDto, item: StyleItemDto): string => {
        if (item == null) return "";
        if (item?.label) return item.label;

        if (item.type === StyleType.Custom) {
            const customItem = item as CustomStyleDto;
            const label = "label";
            return (customItem?.style as { label?: string })?.[label] ?? "Custom style";
        }

        if (item.type === StyleType.Icon) {
            const iconItem = item as IconStyleDto;
            const activeProperties = [
                iconItem.hidden && "hidden",
                iconItem.header && "header",
                iconItem.extendedLegend && "extended Legend",
                iconItem.background && "background",
            ].filter(Boolean);
            return activeProperties.length > 0 ? `${data.name} (${activeProperties.join(", ")})` : data.name;
        }
        return data.name;
    };

    const handleAddIconStyle = () => {
        const newIconStyle: IconStyleDto = {
            id: uuidv4(),
            type: StyleType.Icon,
            icon: {
                src: "",
            },
        };

        setSelectedStyleType(StyleType.Icon);
        styleSchema.styles.push([newIconStyle]);
        setActiveItem(newIconStyle);
        setKey(key + 1);
    }
    const handleAddCustomStyle = () => {
        const newCustomStyle: CustomStyleDto = {
            id: uuidv4(),
            type: StyleType.Custom,
            style: {},
        };
        setSelectedStyleType(StyleType.Custom);
        styleSchema.styles.push([newCustomStyle]);
        setActiveItem(newCustomStyle);
        setKey(key + 1);
    }
    const deleteStyle = async (id: string) => {
        try {
            const updatedStyles = styleSchema.styles.filter(styleRow =>
                !styleRow.some(styleItem => styleItem.id === id)
            );

            const updatedStyleSchema = {
                ...styleSchema,
                styles: updatedStyles
            };

            await service.update(updatedStyleSchema.id!, updatedStyleSchema);
            setStyleSchema(updatedStyleSchema);
            resetForm();
            showToast('Ikonregeln har raderats', 'success');

        } catch (error) {
            console.error(`[${new Date().toISOString()}] ${error}`);
            showToast('Kunde inte radera ikonregeln.', 'error');
        }
    }

    const DeleteButton = ({ onClick }: any) => (
        <IconButton onClick={onClick} edge="end" aria-label="delete">
            {DeleteComponent}
        </IconButton>
    );

    return (
        <Grid container spacing={0} sx={{ display: "flex", flexGrow: 1 }}>
            <Grid
                item
                xs={12}
                md={12}
                sx={{
                    height: "56px",
                    border: "1px solid #E0E0E0",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    p: "10px",
                }}
            >
                <Box component="div" sx={{ display: "flex", alignItems: "center" }}>
                    {" "}
                    <Typography variant="h6" sx={{ marginRight: "8px" }}>
                        Stilschema:
                    </Typography>{" "}
                    <Typography variant="h6" sx={{ marginRight: "8px", maxWidth: '400px' }}>
                        {styleSchema?.name ?? ""}
                    </Typography>{" "}
                </Box>

                <Box component="div" sx={{ display: "flex", justifyContent: "flex-end", alignItems: "center", height: "100%" }}>
                    {isEditorValid && !saveEnabled && <>
                        <Box component="div" sx={{ display: "flex", alignItems: "center", ml: '5px' }}>
                        </Box>
                        <Box component="div" sx={{ display: "flex", justifyContent: "flex-end", alignItems: "center", height: "100%" }}>
                            <Button variant="text" color="primary" disabled={!isEditorValid} onClick={onRouterBackClick}>
                                Tillbaka till listvy
                            </Button>
                        </Box>
                    </>}
                    <Button variant="contained" color="primary" disabled={!isEditorValid} sx={{ m: '10px' }} onClick={handleAddIconStyle}>
                        Ny Ikonregel
                    </Button>
                    <Button variant="contained" color="primary" disabled={!isEditorValid} onClick={handleAddCustomStyle}>
                        Ny regel
                    </Button>
                </Box>
            </Grid>
            <Grid item xs={12} md={3} sx={{ display: "flex" }}>
                <Paper sx={{ borderRadius: "0%", minHeight: "800px", width: "100%" }} elevation={3}>
                    <List component="nav">
                        <ListSubheader id="nested-list-subheader">Regler</ListSubheader>
                        <Divider />
                        {data &&
                            data.styles?.map((item, index) => (
                                <ListItemButton
                                    key={index}
                                    onClick={() => handleListItemClick(item[0])}
                                    divider
                                    sx={{
                                        height: "56px",
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        "&:hover": { backgroundColor: BACKGROUND_COLOR_HOVER },
                                        backgroundColor: activeItem?.id === item[0]?.id ? "#e6f7ff" : "inherit",
                                        borderRight: activeItem?.id == item[0]?.id ? "2px solid #334c63" : "inherit",
                                        color: activeItem?.id == item[0]?.id ? BACKGROUND_COLOR : "inherit",
                                    }}
                                >
                                    <ListItemText primary={generateListItemLabel(data, item[0])} />
                                    {activeItem?.id === item[0]?.id && (
                                        <DeleteButton onClick={(e: any) => {
                                            e.stopPropagation();
                                            deleteStyle(item[0]?.id!);
                                        }} />
                                    )}
                                </ListItemButton>
                            ))}
                    </List>
                </Paper>
            </Grid>
            <Grid item xs={12} md={9}>
                <Paper elevation={3} sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', borderRadius: "0%", minHeight: "800px", p: "20px" }}>
                    <div>
                        {selectedStyleType === StyleType.Icon && (
                            RenderIconForm({ selectedIconStyle: activeItem as IconStyleDto, setSelectedIconStyle: setActiveItem as any })
                        )}
                        {selectedStyleType === StyleType.Custom && (
                            RenderCustomForm({ key: key, selectedCustomStyle: activeItem as CustomStyleDto, setSelectedCustomStyle: setActiveItem as any })
                        )}
                    </div>
                    {activeItem && <Stack direction="row" justifyContent="flex-end" spacing={2} sx={{ marginTop: 'auto', paddingTop: 2 }}>
                        <Button variant="outlined" sx={{ backgroundColor: 'red', color: 'white', borderColor: 'white' }} onClick={handleCancelClick}>
                            Avbryt
                        </Button>
                        <Button variant="contained" disabled={!saveEnabled} onClick={handleSave}>
                            Spara
                        </Button>
                    </Stack>}
                </Paper>
            </Grid>
        </Grid>
    );
};
