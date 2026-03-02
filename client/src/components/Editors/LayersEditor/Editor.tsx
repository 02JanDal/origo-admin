import MainCard from "@/components/Cards/MainCard/MainCard";
import LayerModal from "@/components/Modals/LayerModal";
import { DataRow, TableData } from "@/interfaces";
import { GroupDto, LayerDto, WFSLayerDto, WMSLayerDto, WMTSLayerDto } from "@/shared/interfaces/dtos";
import { Box, InputLabel, TextField, FormHelperText, Typography, Chip, Divider, Stack, Button, Avatar } from "@mui/material";
import IsoIcon from '@mui/icons-material/Iso';
import wmsSpec from "@/assets/specifications/tables/wmsTableSpecification.json";
import wfsSpec from "@/assets/specifications/tables/wfsTableSpecification.json";
import wmtsSpec from "@/assets/specifications/tables/wmtsTableSpecification.json";
import { useEffect, useState } from "react";
import { WMSLayerService, WFSLayerService, WMTSLayerService } from '@/api';
import { mapDataToTableFormat } from "@/utils/mappers/toDataTable";
import EditLayerModal from "@/components/Modals/EditLayerModal";
import EditIcon from '@mui/icons-material/Edit';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import { DragDropContext, Draggable, Droppable } from "@hello-pangea/dnd";
import KeyValuePairEditor from "@/components/Editors/KeyValuePairEditor";

const layerServices = {
    WMS: WMSLayerService,
    WFS: WFSLayerService,
    WMTS: WMTSLayerService,
};
interface SelectedRows {
    WMS: DataRow[];
    WFS: DataRow[];
    WMTS: DataRow[];
}
type LayerType = 'WMS' | 'WFS' | 'WMTS';
interface LayerTableData {
    WMS: TableData;
    WFS: TableData;
    WMTS: TableData;
}

interface RawLayerDataState {
    WMS: WMSLayerDto[];
    WFS: WFSLayerDto[];
    WMTS: WMTSLayerDto[];
}

interface EditorProps {
    selectedGroup: GroupDto;
    isEditorValid: boolean;
    setLayers: (layers: LayerDto[]) => void;
    layers: LayerDto[];
    onSaveClick: () => void;
    onCancelClick: () => void;
    onEditorChange: (field: keyof GroupDto | null, value: any, layersChanged: boolean) => void;
}
export const Editor = ({ selectedGroup, isEditorValid, onSaveClick, onCancelClick, onEditorChange, setLayers, layers }: EditorProps) => {
    const [selectedRows, setSelectedRows] = useState<SelectedRows>({ WMS: [], WFS: [], WMTS: [] });
    const [modalOpen, setModalOpen] = useState<LayerType | null>(null);
    const [editModalOpen, setEditModalOpen] = useState(false);
    const initialTableData: TableData = { columns: [], rows: [] };
    const [rawLayerData, setRawLayerData] = useState<RawLayerDataState>({ WMS: [], WFS: [], WMTS: [] });
    const specs = { WMS: wmsSpec, WFS: wfsSpec, WMTS: wmtsSpec };
    const [layerTableData, setLayerTableData] = useState<LayerTableData>({ WMS: initialTableData, WFS: initialTableData, WMTS: initialTableData });
    const [saveTriggered, setSaveTriggered] = useState(false);
    const [unEditedGroupName, setUnEditedGroupName] = useState(selectedGroup.name);
    const [selectedLayer, setSelectedLayer] = useState<LayerDto | undefined>(undefined);
    const [localLayersState, setLocalLayersState] = useState<LayerDto[]>([]);
    const [groupName, setGroupName] = useState(selectedGroup.name);
    const [isNameFilled, setIsNameFilled] = useState(!!selectedGroup.name);
    const [isTitleFilled, setIsTitleFilled] = useState(!!selectedGroup.title);

    useEffect(() => {
        Object.keys(layerServices).forEach((type) => {
            fetchLayerData(type as LayerType);
        });
    }, []);
    useEffect(() => {
        if (selectedGroup && layers.length > 0) {
            const localLayers = layers.filter(layer => layer.group === groupName);
            const layersDeepCopy = JSON.parse(JSON.stringify(localLayers));
            setLocalLayersState(layersDeepCopy);
        }
    }, [layers]);

    useEffect(() => {
        syncSelectedRowsWithLayersOnLoad();
    }, [localLayersState]);


    useEffect(() => {
        if (saveTriggered) {
            onSaveClick();
            setSaveTriggered(false);
            setUnEditedGroupName(selectedGroup.name);

        }
    }, [layers, saveTriggered]);

    const handleTextFieldChange = (field: keyof GroupDto, value: string) => {
        onEditorChange(field, value, false);
        if (field === 'title') {
            setIsTitleFilled(!!value.trim());
        }
    };

    const handleOpenModal = (type: LayerType) => {
        setModalOpen(type);
    };

    const handleNameChange = (value: string) => {
        setGroupName(value);
        setIsNameFilled(!!value.trim());
        const updLayers: LayerDto[] = localLayersState.map(layer => ({
            ...layer,
            group: value
        }));

        setLocalLayersState(updLayers);

        onEditorChange('name', value, false);
    };
    const handleCloseModal = () => {
        setModalOpen(null);
    };
    const handleEditCloseModal = () => {
        setEditModalOpen(false);
    };

    const handleSave = () => {
        setSaveTriggered(true);
        updateLayersFromLocalLayerState();
    }

    const updateLayersFromLocalLayerState = () => {
        const nonSelectedGroupLayers = layers.filter(layer => layer.group !== unEditedGroupName);
        const updatedLayers = [...nonSelectedGroupLayers, ...localLayersState];
        setLayers(updatedLayers);
    };

    const fetchLayerData = async (type: LayerType) => {
        const service = layerServices[type];
        const response = await service.fetchAll();
        setRawLayerData((prevData) => ({ ...prevData, [type]: response }));
        const mappedData = mapDataToTableFormat(response, specs[type].specification);
        setLayerTableData((prevData) => ({ ...prevData, [type]: mappedData }));
    };

    const groupNameExists = (groups: GroupDto[], nameToCheck: string, currentGroupId?: string): boolean => {
        for (const group of groups) {
            if (group.id !== currentGroupId && group.name === nameToCheck) {
                return true;
            }
            if (group.groups && groupNameExists(group.groups, nameToCheck, currentGroupId)) {
                return true;
            }
        }
        return false;
    };

    const handleRowSelectionChanged = (type: LayerType, selectedRowIds: string[]) => {
        handleLayerChange(type, selectedRowIds);
        updateSelectedRows(type, selectedRowIds);
    };

    const handleLayerChange = (type: LayerType, selectedRowIds: string[]) => {
        onEditorChange(null, '', true);

        setLocalLayersState(prevState => {
            const otherTypeLayers = prevState.filter(layer => layer.type !== type);

            const existingLayersOfType = prevState.filter(layer => layer.type === type);
            const existingLayerIds = new Set(existingLayersOfType.map(layer => layer.id.toString()));

            const layersToAdd = selectedRowIds.filter(id => !existingLayerIds.has(id));
            const layersToKeep = existingLayersOfType.filter(layer => selectedRowIds.includes(layer.id.toString()));

            const newLayers = layersToAdd.map(id => {
                const layerToAdd = rawLayerData[type]?.find(rawLayer => rawLayer.id.toString() === id);
                if (layerToAdd) {
                    return {
                        ...layerToAdd,
                        group: groupName,
                        type
                    };
                }
                return null;
            }).filter((layer): layer is NonNullable<typeof layer> => layer !== null);

            return [...otherTypeLayers, ...layersToKeep, ...newLayers];
        });
    }
    const updateSelectedRows = (type: LayerType, selectedRowIds: string[]) => {
        setSelectedRows(prevRows => {
            const currentSelectedSet = new Set(prevRows[type].map(row => row.id.toString()));

            const rowsToAdd = selectedRowIds.filter(id => !currentSelectedSet.has(id));
            const rowsToRemove = prevRows[type].filter(row => !selectedRowIds.includes(row.id.toString()));

            const newRowsToAdd = rowsToAdd
                .map(id => layerTableData[type]?.rows.find(row => row.id.toString() === id))
                .filter((row): row is NonNullable<typeof row> => row !== null);

            const updatedRows = [
                ...prevRows[type].filter(row => !rowsToRemove.includes(row)),
                ...newRowsToAdd
            ];

            return {
                ...prevRows,
                [type]: updatedRows,
            };
        });
    }

    const handleDeleteLayerOnChip = (type: LayerType, layerId: string) => {
        const updatedSelectedRows = { ...selectedRows };
        if (updatedSelectedRows[type].some(row => row.id.toString() === layerId)) {
            updatedSelectedRows[type] = updatedSelectedRows[type].filter(row => row.id.toString() !== layerId); setSelectedRows(updatedSelectedRows);
        }
        const layerToDelete = localLayersState.find(layer => layer.id.toString() === layerId);
        if (layerToDelete) {
            const updatedLayers = localLayersState.filter(layer => layer.id.toString() !== layerId);
            setLocalLayersState(updatedLayers);
        }
    }

    const handleClickOnChip = (type: LayerType, selectedRowId: string) => {
        const selectedLayer = localLayersState.find(layer => layer.id.toString() === selectedRowId);
        setSelectedLayer(selectedLayer);
        setEditModalOpen(true);
    }

    const handleVisible = (layer: LayerDto) => {
        const updatedLayers = localLayersState.map((localLayer) => {
            if (localLayer.id === layer.id) {
                return { ...localLayer, visible: !localLayer.visible };
            }
            return localLayer;
        });
        setLocalLayersState(updatedLayers);
    }

    const handleDragEnd = (result: any) => {
        if (!result.destination) {
            return;
        }
        const { source, destination } = result;
        const updatedLayers = [...localLayersState];
        const [removed] = updatedLayers.splice(source.index, 1);
        updatedLayers.splice(destination.index, 0, removed);
        setLocalLayersState(updatedLayers);
    }

    const syncSelectedRowsWithLayersOnLoad = () => {
        const newSelectedRows: SelectedRows = {
            WMS: [],
            WFS: [],
            WMTS: [],
        };
        localLayersState.forEach(layer => {
            if (layer.group === groupName) {
                const type = layer.type as LayerType;
                const rowData: DataRow = {
                    id: layer.id,
                    title: layer.title,
                };
                newSelectedRows[type].push(rowData);
            }
        });
        setSelectedRows(newSelectedRows);
    };

    return (
        <MainCard style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', borderRadius: "0%" }} title='Information'>
            <Box component='div' sx={{
                '& > *': {
                    margin: '8px'
                },
                '& .MuiInputLabel-root': { marginBottom: '0px' },
                maxHeight: 'calc(100vh - 300px)',
                overflowY: 'auto',
                flex: 1,
                padding: '16px'
            }}>
                <InputLabel>Titel</InputLabel>
                <TextField
                    id="title"
                    name="Title"
                    fullWidth
                    value={selectedGroup.title}
                    onChange={(e) => handleTextFieldChange('title', e.target.value)} />
                <InputLabel>Namn</InputLabel>
                <TextField
                    name="Name"
                    fullWidth
                    value={selectedGroup.name}
                    onChange={(e) => handleNameChange(e.target.value)} />
                {!isEditorValid && <FormHelperText sx={{ color: 'red' }}>* Samma namn har redan angivits för en annan grupp, vänligen välj ett annat namn</FormHelperText>}
                <InputLabel>Beskrivning</InputLabel>
                <TextField
                    name="Abstract"
                    fullWidth
                    multiline
                    minRows={6}
                    value={selectedGroup.abstract}
                    onChange={(e) => handleTextFieldChange('abstract', e.target.value)} />

                <Box component='div' sx={{
                    marginTop: '20px',
                    '& > *': {
                        marginTop: '1vh'
                    },
                    '& .MuiInputLabel-root': { marginBottom: '0px' }
                }}>
                    <Box component='div' sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                        <Typography variant="subtitle1" component="label" htmlFor="title">
                            Hantera Lager
                        </Typography>
                        <Box component='div'>
                            <Chip icon={<IsoIcon />} label="WMS" color="primary" variant="outlined" onClick={() => handleOpenModal("WMS")} sx={{ marginLeft: 1 }} />
                            <Chip icon={<IsoIcon />} label="WFS" color="primary" variant="outlined" onClick={() => handleOpenModal("WFS")} sx={{ marginLeft: 1 }} />
                            <Chip icon={<IsoIcon />} label="WMTS" color="primary" variant="outlined" onClick={() => handleOpenModal("WMTS")} sx={{ marginLeft: 1 }} />
                        </Box>
                    </Box>
                </Box>
                <Divider sx={{ marginBottom: '10px' }} />
                <Stack direction="column" spacing={2}>
                    <DragDropContext onDragEnd={handleDragEnd}>
                        <Droppable droppableId="layers">
                            {(provided) => (
                                <Stack direction="column" spacing={1} alignItems="flex-start" ref={provided.innerRef} {...(provided.droppableProps)}>
                                    {localLayersState.filter(layer => layer.group === groupName || layer.group === undefined).map((layer, index) => (
                                        (
                                            <Draggable key={layer.id} draggableId={layer.id} index={index}>
                                                {(provided) => (
                                                    <Chip
                                                        ref={provided.innerRef}
                                                        {...provided.draggableProps}
                                                        {...provided.dragHandleProps}
                                                        key={`${layer.type}-${index}`}
                                                        label={`[${layer.type}] ${layer.title}`}
                                                        variant="outlined"
                                                        sx={{ borderRadius: '0' }}
                                                        avatar={
                                                            <>
                                                                <Avatar style={{ margin: '4px' }}>
                                                                    <EditIcon
                                                                        style={{ color: 'white', fontSize: '18px' }}
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            handleClickOnChip(layer.type as LayerType, layer.id);
                                                                        }} />
                                                                </Avatar>
                                                                {!layer.visible ?
                                                                    <Avatar>
                                                                        <VisibilityOffIcon
                                                                            style={{ color: 'white', fontSize: '18px' }}
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                handleVisible(layer);
                                                                            }} />
                                                                    </Avatar> :
                                                                    <Avatar>
                                                                        <VisibilityIcon
                                                                            style={{ color: 'white', fontSize: '18px' }}
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                handleVisible(layer);
                                                                            }} />
                                                                    </Avatar>
                                                                }
                                                            </>
                                                        }
                                                        onDelete={() => handleDeleteLayerOnChip(layer.type as LayerType, layer.id)}
                                                        disabled={!layers.some(layer => layer.id === layer.id && layer.group === unEditedGroupName)} />
                                                )}
                                            </Draggable>
                                        )
                                    ))}
                                    {provided.placeholder}
                                </Stack>
                            )}
                        </Droppable>
                    </DragDropContext>

                    <KeyValuePairEditor
                        value={selectedGroup.extendedAttributes ?? []}
                        onChange={(v) => onEditorChange("extendedAttributes", v, false)}
                    />

                    <Stack direction="row" justifyContent="flex-end" spacing={2}>
                        <Button
                            variant="outlined"
                            sx={{ backgroundColor: 'red', color: 'white', borderColor: 'white' }}
                            onClick={onCancelClick}
                        >
                            Avbryt
                        </Button>
                        <Button
                            variant="contained"
                            disabled={!isEditorValid || !isNameFilled || !isTitleFilled}
                            onClick={handleSave}
                        >
                            Spara
                        </Button>
                    </Stack>
                </Stack>
                {
                    modalOpen && (
                        <LayerModal
                            open={!!modalOpen}
                            handleClose={handleCloseModal}
                            tableData={layerTableData[modalOpen]}
                            selectedRows={selectedRows[modalOpen]}
                            onRowSelectionChanged={(newSelectedRows) => handleRowSelectionChanged(modalOpen, newSelectedRows)}
                        />
                    )
                }
                {
                    editModalOpen && (
                        <EditLayerModal
                            open={!!editModalOpen}
                            handleClose={handleEditCloseModal}
                            editedLayers={localLayersState}
                            setEditedLayers={setLocalLayersState}
                            layerToEdit={selectedLayer as LayerDto}
                            featureInfoClickLayers={Array.from(new Set(layers.filter(layer => layer.type === 'WFS').map(layer => layer.name)))}
                        />
                    )
                }
            </Box >
        </MainCard >
    );
}
