import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Button, GridLegacy as Grid, Stack } from '@mui/material';

import React, { useEffect, useState } from 'react';
import HoverCard from '../Cards/HoverCard/HoverCard';

export interface TransferListItem {
    id: string;
    content: string;
    icon?: string;
    data: any;
}
interface TransferListProps {
    items: TransferListItem[];
    selectedItems?: TransferListItem[];
    handleOnSave: (choosenControls: TransferListItem[]) => void;
    leftSideLabel?: string;
    rightSideLabel?: string;
}

const TransferList = ({ items, selectedItems, handleOnSave, leftSideLabel = 'Tillgängliga', rightSideLabel = 'Valda' }: TransferListProps) => {
    const [leftItems, setLeftItems] = useState<TransferListItem[]>([]);
    const [rightItems, setRightItems] = useState<TransferListItem[]>([]);
    const [saveEnabled, setSaveEnabled] = useState<boolean>(false);
    const [cancelEnabled, setCancelEnabled] = useState<boolean>(false)

    const onSaveClick = () => {
        if (rightItems !== undefined) {
            handleOnSave(rightItems);
        }
    };
    const onCancelClick = () => {
        const selectedIds = selectedItems?.map(item => item.id);
        const leftSide = items!.filter(item => !selectedIds?.includes(item.id!));
        setLeftItems(leftSide || []);
        setRightItems(selectedItems || []);
        setSaveEnabled(false);
        setCancelEnabled(false);
    };

    useEffect(() => {
        if (selectedItems && selectedItems?.length > 0) {
            const selectedIds = selectedItems.map(item => item.id);
            const leftSide = items!.filter(item => !selectedIds.includes(item.id!));
            setLeftItems(leftSide);
            setRightItems(selectedItems);
        }
        else {
            setLeftItems(items);
        }
    }, [items, selectedItems]);

    const bgColors = ['#95de64', '#ad6800', '#13c2c2', '#1677ff', '#262626', '#ff4d4f']
    const randomColor = () => {
        return bgColors[Math.floor(Math.random() * bgColors.length)];
    }

    const handleAddAll = () => {
        setRightItems([...rightItems, ...leftItems]);
        setLeftItems([]);
        setSaveEnabled(true);
        setCancelEnabled(true);
    };

    const handleRemoveAll = () => {
        setLeftItems([...leftItems, ...rightItems]);
        setRightItems([]);
        setSaveEnabled(true);
        setCancelEnabled(true);
    };

    const handleDragEnd = (result: any) => {
        const { source, destination } = result;

        if (!destination) {
            return;
        }
        setSaveEnabled(true);
        setCancelEnabled(true);
        if (source.droppableId === destination.droppableId) {
            const items = source.droppableId === 'left' ? [...leftItems] : [...rightItems];
            const [removed] = items.splice(source.index, 1);
            items.splice(destination.index, 0, removed);
            if (source.droppableId === 'left') {
                setLeftItems(items);
            } else {
                setRightItems(items as never[]);
            }
        } else {
            const sourceItems = source.droppableId === 'left' ? [...leftItems] : [...rightItems];
            const destinationItems = destination.droppableId === 'left' ? [...leftItems] : [...rightItems];
            const [removed] = sourceItems.splice(source.index, 1);
            destinationItems.splice(destination.index, 0, removed);

            if (source.droppableId === 'left') {
                setLeftItems(sourceItems);
                setRightItems(destinationItems);
            } else {
                setLeftItems(destinationItems);
                setRightItems(sourceItems);
            }
        }
    };

    const scrollableListStyle: React.CSSProperties = {
        maxHeight: 'calc(100vh - 300px)',
        overflowY: 'auto',
        flex: 1,
        padding: '16px'
    };

    const stickyButtonStyle: React.CSSProperties = {
        position: 'sticky',
        bottom: 0,
        backgroundColor: 'white',
        paddingTop: 2
    };

    return (
        <Grid>
            <DragDropContext onDragEnd={handleDragEnd}>
                <div style={{ display: 'flex' }}>
                    <Droppable droppableId="left">
                        {(provided) => (
                            <div
                                ref={provided.innerRef}
                                {...provided.droppableProps}
                                style={scrollableListStyle}
                            >
                                <Stack direction="row" alignItems="center">
                                    <h2>{leftSideLabel}</h2>
                                    <Button onClick={handleAddAll} sx={{ ml: 9 }} variant="outlined">Lägg till alla</Button>
                                </Stack>
                                {leftItems.map((item, index) => (
                                    <Draggable key={item.id} draggableId={item.id} index={index}>
                                        {(provided) => (
                                            <div
                                                ref={provided.innerRef}
                                                {...provided.draggableProps}
                                                {...provided.dragHandleProps}
                                            >
                                                <HoverCard
                                                    id={item.id}
                                                    title={item.content}
                                                    cardColor={'#1677ff'}
                                                    size='listItem'
                                                />
                                            </div>
                                        )}
                                    </Draggable>
                                ))}
                                {provided.placeholder}
                            </div>
                        )}
                    </Droppable>
                    <Droppable droppableId="right">
                        {(provided) => (
                            <div
                                ref={provided.innerRef}
                                {...provided.droppableProps}
                                style={scrollableListStyle}
                            >
                                <Stack direction="row" alignItems="center">
                                    <h2>{rightSideLabel}</h2>
                                    <Button onClick={handleRemoveAll} sx={{ ml: 18 }} variant="outlined">Ta bort alla</Button>
                                </Stack>
                                {rightItems.map((item, index) => (
                                    <Draggable key={item.id} draggableId={item.id} index={index}>
                                        {(provided) => (
                                            <div
                                                ref={provided.innerRef}
                                                {...provided.draggableProps}
                                                {...provided.dragHandleProps}
                                            >
                                                <HoverCard
                                                    id={item.id}
                                                    title={item.content}
                                                    icon={item.icon}
                                                    cardColor={'#13c2c2'}
                                                    size='listItem'
                                                />
                                            </div>
                                        )}
                                    </Draggable>
                                ))}
                                {provided.placeholder}
                            </div>
                        )}
                    </Droppable>
                </div>
            </DragDropContext>
            <Stack direction="row" justifyContent="flex-end" spacing={2} sx={stickyButtonStyle}>
                <Button
                    variant="outlined"
                    sx={{
                        backgroundColor: cancelEnabled ? 'red' : 'lightgray',
                        color: cancelEnabled ? 'white' : 'inherit',
                        borderColor: cancelEnabled ? 'white' : 'lightgray',
                        '&:hover': {
                            backgroundColor: cancelEnabled ? 'darkred' : 'lightgray',
                            borderColor: cancelEnabled ? 'white' : 'lightgray',
                        },
                    }}
                    disabled={!cancelEnabled}
                    onClick={onCancelClick}
                >
                    Ångra
                </Button>
                <Button variant="contained" onClick={onSaveClick} disabled={!saveEnabled} >
                    Spara
                </Button>
            </Stack>
        </Grid>
    );
};

export default TransferList;