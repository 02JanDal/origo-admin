import { GroupDto, LayerDto } from "@/shared/interfaces/dtos";
import { getIcon } from "@/utils/helpers/iconHelper";
import { ExpandLess, ExpandMore } from "@mui/icons-material";
import { Divider, ListItemButton, ListItemText, Box, IconButton, Collapse, List, GridLegacy as Grid, Paper, ListSubheader, Typography } from "@mui/material";
import React, { useState } from "react";
import { v4 as uuidv4 } from "uuid";

interface EditorListProps {
    isDisabled?: boolean;
    setGroups: React.Dispatch<React.SetStateAction<GroupDto[]>>;
    onGroupClick: (group: GroupDto) => void;
    groups: GroupDto[];
    selectedGroup: GroupDto | null;
    setSelectedGroup: (selectedGroup: GroupDto) => void;
    onDelete: () => void;
}

export const ListComponent = ({ isDisabled, setGroups, groups, setSelectedGroup, selectedGroup, onDelete }: EditorListProps) => {
    const BACKGROUND_COLOR = "#334c63";
    const BACKGROUND_COLOR_HOVER = "#e6f7ff";
    const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
    const DeleteComponent = getIcon('DeleteOutline', '#1890FF', 25);
    const NewFolderComponent = getIcon('AddCircleOutline', '#1890FF', 25);
    const isGroupExpanded = (group: GroupDto) => expandedGroups.has(group.id);

    const toggleGroup = (group: GroupDto) => {
        const newExpandedGroups = new Set(expandedGroups);
        if (expandedGroups.has(group.id)) {
            newExpandedGroups.delete(group.id);
        } else {
            newExpandedGroups.add(group.id);
        }
        setExpandedGroups(newExpandedGroups);
    };

    const handleGroupClick = (group: GroupDto) => {
        setSelectedGroup(group);
        toggleGroup(group);
    };

    const handleAddItem = (parentId?: string) => {
        const newGroup: GroupDto = {
            id: uuidv4(),
            title: "Ny Grupp",
            name: "",
            abstract: "",
            expanded: false,
            groups: []
        };

        if (parentId) {
            const addGroupToParent = (groups: GroupDto[], parentId: string, newGroup: GroupDto): GroupDto[] => {
                return groups.map(group => {
                    if (group.id === parentId) {
                        return {
                            ...group,
                            groups: [...(group.groups || []), newGroup]
                        };
                    } else if (group.groups) {
                        return {
                            ...group,
                            groups: addGroupToParent(group.groups, parentId, newGroup)
                        };
                    }
                    return group;
                });
            };
            setGroups(currentGroups => addGroupToParent(currentGroups, parentId, newGroup));
            toggleGroup(selectedGroup!);
        } else {
            setGroups(currentGroups => [...currentGroups, newGroup]);
        }
    };
    const deleteGroup = async (groupId: string) => {
        onDelete();
    };

    interface NestedGroupProps {
        group: GroupDto;
        level?: number;
        onDeleteGroup: (groupId: string) => void;
    }
    const NestedGroup: React.FC<NestedGroupProps> = ({ group, level = 0, onDeleteGroup }) => {
        const open = isGroupExpanded(group);

        const listItemButtonProps = {
            onClick: () => handleGroupClick(group),
            sx: {
                height: "56px",
                display: 'flex',
                justifyContent: 'space-between',
                "&:hover": { backgroundColor: BACKGROUND_COLOR_HOVER },
                backgroundColor: selectedGroup?.id === group.id ? "#e6f7ff" : "inherit",
                borderRight: selectedGroup?.id === group.id ? "2px solid #334c63" : "inherit",
                color: selectedGroup?.id === group.id ? BACKGROUND_COLOR : "inherit",
                ...(level > 0 && { paddingLeft: `${level * 30}px` }),
            },
        };

        return (
            <>
                {level === 0 && <Divider />}
                <ListItemButton {...listItemButtonProps} disabled={isDisabled}>
                    <ListItemText
                        primary={group.title}
                        sx={{
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            flexGrow: 1,
                            minWidth: 0,
                            marginRight: '8px',
                        }}
                    />
                    <Box
                        component='div'
                        sx={{
                            display: 'flex',
                            flexDirection: 'row',
                            alignItems: 'center',
                            flexShrink: 0,
                            flexWrap: 'wrap',
                            gap: '4px',
                        }}
                    >
                        {selectedGroup?.id === group.id && (
                            <>
                                <IconButton onClick={() => handleAddItem(group.id)} size="small">
                                    {NewFolderComponent}
                                </IconButton>
                                <IconButton
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onDeleteGroup(group.id);
                                    }}
                                    size="small"
                                >
                                    {DeleteComponent}
                                </IconButton>
                            </>
                        )}
                        {group.groups?.length ? (
                            open ? (
                                <ExpandLess fontSize="small" />
                            ) : (
                                <ExpandMore fontSize="small" />
                            )
                        ) : null}
                    </Box>
                </ListItemButton>
                <Collapse in={open} timeout="auto" unmountOnExit>
                    <List component="div" disablePadding>
                        {group.groups?.map((subGroup, index) => (
                            <NestedGroup
                                key={index}
                                group={subGroup}
                                level={level + 1}
                                onDeleteGroup={onDeleteGroup}
                            />
                        ))}
                    </List>
                </Collapse>
            </>
        );
    };


    return (<Grid item xs={12} md={3} sx={{ display: "flex", flexDirection: "column" }}>
        <Paper sx={{ flex: 1, overflowY: 'auto', borderRadius: "0%" }} elevation={3}>
            <List component="nav">
                <ListSubheader component="div" id="nested-list-subheader">
                    <Box component='div' sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '54px' }}>
                        <Typography variant="subtitle1">Grupper</Typography>
                        <IconButton onClick={() => handleAddItem()} aria-label="new folder">
                            {NewFolderComponent}
                        </IconButton>
                    </Box>
                </ListSubheader>
                <Box component='div' sx={{
                    maxHeight: 'calc(100vh - 300px)',
                    overflowY: 'auto',
                    flex: 1,
                    padding: '16px'
                }}>
                    {groups.map((group, index) => (
                        <NestedGroup key={index} group={group} onDeleteGroup={deleteGroup} />
                    ))}
                </Box>
            </List>
        </Paper>
    </Grid>);
}