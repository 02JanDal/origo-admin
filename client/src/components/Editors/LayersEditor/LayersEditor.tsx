import { GroupDto, LayerDto } from "@/shared/interfaces/dtos";
import { Box, Grid, Typography } from "@mui/material";
import { ListComponent } from "./ListComponent";
import { useState } from "react";
import { Editor } from "./Editor";
import AlertDialog from "@/components/Dialogs/AlertDialog";

interface LayersEditorProps {
    setGroups: React.Dispatch<React.SetStateAction<GroupDto[]>>;
    groups: GroupDto[];
    setLayers: (layers: LayerDto[]) => void;
    layers: LayerDto[];
    onHandleSave: (updatedGroups: GroupDto[], updatedLayers: LayerDto[]) => void;
}

export const LayersEditor = ({ setGroups, groups, setLayers, layers, onHandleSave }: LayersEditorProps) => {
    const [selectedGroup, setSelectedGroup] = useState(null as unknown as GroupDto | null);
    const [isEditorValid, setIsEditorValid] = useState(true);
    const [unEditedGroup, setUnEditedGroup] = useState(null as unknown as GroupDto | null);
    const [unEditedLayers, setUnEditedLayers] = useState(null as unknown as LayerDto[] | null);
    const [isListDisabled, setIsListDisabled] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

    const onGroupClick = (group: GroupDto) => {
        setSelectedGroup(group);
        const copyOfSelectedGroup = JSON.parse(JSON.stringify(group));
        setUnEditedGroup(copyOfSelectedGroup);

        const copyOfLayers = JSON.parse(JSON.stringify(layers));
        setUnEditedLayers(copyOfLayers);
    };

    const onSaveClick = () => {
        onHandleSave(groups, layers);
        resetState();
    };

    const onDelete = () => {
        setIsDeleteModalOpen(true);
    }

    const confirmDelete = () => {
        const removeGroupFromParent = (groups: GroupDto[], groupId: string): GroupDto[] => {
            return groups.reduce((acc, group) => {
                if (group.id === groupId) {
                    return acc;
                } else if (group.groups) {
                    const updatedSubGroups = removeGroupFromParent(group.groups, groupId);
                    return [...acc, { ...group, groups: updatedSubGroups }];
                }
                return [...acc, group];
            }, [] as GroupDto[]);
        };
        const updatedGroups = removeGroupFromParent(groups, selectedGroup?.id!);
        const updatedLayers = layers.filter(layer => layer.group !== selectedGroup?.name);

        setGroups(updatedGroups);
        setLayers(updatedLayers);
        setSelectedGroup(null);
        onHandleSave(updatedGroups, updatedLayers);
        resetState();
        setIsDeleteModalOpen(false);
    }

    const onCancelClick = () => {
        if (unEditedGroup) {
            const updatedGroups = replaceOrUpdateGroup(groups, unEditedGroup, true);
            setGroups(updatedGroups);
            setSelectedGroup(unEditedGroup);
        } else {
            setSelectedGroup(null);
        }
        if (unEditedLayers) {
            setLayers(unEditedLayers);
        }

        resetState();
    };

    const onEditorChange = (field: keyof GroupDto | null, value: any, layersChanged: boolean = false) => {
        if (!selectedGroup) return;
        if (layersChanged) {
            setIsListDisabled(true);
            return;
        }
        if (field === 'name' && groupNameExists(groups, value, selectedGroup.id)) {
            setIsEditorValid(false);
            return;
        }
        if (field !== null) {
            const updatedSelectedGroup = { ...selectedGroup, [field]: value };
            setSelectedGroup(updatedSelectedGroup);
            const updatedGroups = replaceOrUpdateGroup(groups, updatedSelectedGroup);
            setGroups(updatedGroups);
        }
        setIsListDisabled(true);
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

    const replaceOrUpdateGroup = (groups: GroupDto[], targetGroup: GroupDto, replace: boolean = false): GroupDto[] => {
        return groups.map(group => {
            if (group.id === targetGroup.id && replace) {
                return targetGroup;
            } else if (group.id === targetGroup.id) {
                return { ...group, ...targetGroup };
            } else if (group.groups) {
                return { ...group, groups: replaceOrUpdateGroup(group.groups, targetGroup, replace) };
            }
            return group;
        });
    };

    const resetState = () => {
        setIsEditorValid(true);
        setIsListDisabled(false);
        setUnEditedGroup(null);
    };

    return (
        <Grid container spacing={0} sx={{ display: "flex", flexGrow: 1 }}>
            <Grid item xs={12} md={12} sx={{
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
                        Hantera lager och grupper:
                    </Typography>{" "}
                </Box>
            </Grid>
            <Grid container spacing={0} sx={{ height: '80vh' }}>
                <ListComponent selectedGroup={selectedGroup} onGroupClick={onGroupClick} isDisabled={isListDisabled} setGroups={setGroups}
                    groups={groups} setSelectedGroup={setSelectedGroup} onDelete={onDelete}
                />
                <Grid item xs={12} md={9} sx={{ display: "flex", flexDirection: "column", borderColor: '1px solid white' }}>
                    {selectedGroup &&
                        <Editor selectedGroup={selectedGroup} key={selectedGroup.id} isEditorValid={isEditorValid} onSaveClick={onSaveClick}
                            onCancelClick={onCancelClick} onEditorChange={onEditorChange} setLayers={setLayers} layers={layers} ></Editor>
                    }
                    <AlertDialog open={isDeleteModalOpen} title="Borttagning av grupp" contentText="Bekräfta bortagning av gruppen!" onClose={() => setIsDeleteModalOpen(false)} onConfirm={() => confirmDelete()} />
                </Grid>
            </Grid>
        </Grid>
    )
}