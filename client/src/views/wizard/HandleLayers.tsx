import React, { useCallback, useEffect, useState } from 'react';
import { GridLegacy as Grid, Accordion, AccordionSummary, AccordionDetails, Typography, Box, IconButton } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import SaveIcon from '@mui/icons-material/Save';
import MainCard from '@/components/Cards/MainCard/MainCard';
import { Column, DataRow } from '@/interfaces';
import { DynamicForm } from '@/components/Forms/DynamicForm';
import ReportProblemIcon from '@mui/icons-material/ReportProblem';
import { KeyValuePair } from '@/shared/interfaces/dtos';

interface DataProps {
    selectedRows: DataRow[];
    columns: Column[];
    updateDataRow: (updateRow: DataRow) => void;
    setAreHandleLayersValid: (isValid: boolean) => void;
}

export default function HandleLayers({ selectedRows, updateDataRow, columns, setAreHandleLayersValid }: DataProps) {
    const [editableData, setEditableData] = useState(selectedRows);
    const [openAccordions, setOpenAccordions] = useState(new Set<number>());
    const [invalidForms, setInvalidForms] = useState<Set<number>>(new Set());
    const [triggerValidation, setTriggerValidation] = useState<{ [key: number]: number }>({});

    useEffect(() => {
        setEditableData(selectedRows);
    }, [selectedRows]);

    const handleEditChange = (value: string | KeyValuePair[], index: number, field: keyof DataRow) => {
        const updatedData = editableData.map((layer, idx) =>
            idx === index ? { ...layer, [field]: value } : layer
        );
        setEditableData(updatedData);
    };

    const handleSave = useCallback((index: number) => {
        updateDataRow(editableData[index]);
        if (invalidForms.size === 0) {
            setAreHandleLayersValid(true);
        } else {
            setAreHandleLayersValid(false);
        }
        if (!invalidForms.has(index)) {
            handleAccordionToggle(index);
        }
    }, [editableData, invalidForms, updateDataRow, setAreHandleLayersValid]);

    const handleAccordionToggle = useCallback((index: number) => {
        setOpenAccordions((prevOpenAccordions) => {
            const updatedOpenAccordions = new Set(prevOpenAccordions);
            if (updatedOpenAccordions.has(index)) {
                updatedOpenAccordions.delete(index);
            } else {
                updatedOpenAccordions.add(index);
                setTriggerValidation(prev => ({ ...prev, [index]: (prev[index] || 0) + 1 }));

            }
            return updatedOpenAccordions;
        });
    }, []);

    const handleValidityChange = useCallback((isValid: boolean, index: number) => {
        setInvalidForms((prev) => {
            const newInvalidForms = new Set(prev);
            if (isValid) {
                newInvalidForms.delete(index);
            } else {
                newInvalidForms.add(index);
            }
            return newInvalidForms;
        });
    }, []);

    return (
        <MainCard title="Hantera Lager" style={{ marginTop: '15px', marginBottom: '15px' }}>
            <Grid container spacing={2}>
                {editableData.map((row, index) => (
                    <Grid item xs={12} key={index}>
                        <Accordion expanded={openAccordions.has(index)} onChange={() => handleAccordionToggle(index)}>
                            <AccordionSummary
                                expandIcon={<ExpandMoreIcon />}
                                aria-controls={`panel${index}-content`}
                                id={`panel${index}-header`}
                            >
                                <Box component='div' sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                                    <Typography sx={{ flex: 1 }}>{row.title}</Typography>
                                    {invalidForms.has(index) && <ReportProblemIcon color="error" sx={{ marginRight: '8px' }} />}
                                    {openAccordions.has(index) && !invalidForms.has(index) && (
                                        <IconButton
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleSave(index);
                                            }}
                                            size="small"
                                            sx={{ marginRight: '8px' }}
                                        >
                                            <SaveIcon />
                                        </IconButton>
                                    )}
                                </Box>
                            </AccordionSummary>
                            <AccordionDetails>
                                <DynamicForm
                                    row={row}
                                    handleEditChange={handleEditChange}
                                    handleSave={handleSave}
                                    index={index}
                                    columns={columns}
                                    onValidityChange={handleValidityChange}
                                    triggerValidation={triggerValidation[index]}
                                />
                            </AccordionDetails>
                        </Accordion>
                    </Grid>
                ))}
            </Grid>
        </MainCard>
    );
}